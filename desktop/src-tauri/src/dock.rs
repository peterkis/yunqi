//! Floating and top-edge windows. The subclass and its timers run on the HWND owner thread.
use serde::{Deserialize, Serialize};
use std::{
    cell::{Cell, RefCell},
    collections::BTreeMap,
    mem::size_of,
    path::PathBuf,
    time::{Duration, Instant},
};
use windows_sys::Win32::{
    Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM},
    Graphics::Gdi::{
        EnumDisplayMonitors, GetMonitorInfoW, MonitorFromWindow, HDC, HMONITOR, MONITORINFOEXW,
        MONITOR_DEFAULTTONEAREST,
    },
    UI::{
        Controls::WM_MOUSELEAVE,
        HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI},
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, GetCapture, ReleaseCapture, SetCapture, TrackMouseEvent, TME_LEAVE,
            TRACKMOUSEEVENT, VK_LBUTTON,
        },
        Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass},
        WindowsAndMessaging::*,
    },
};

const REFLOW: u32 = WM_APP + 402;
const EDGE_TIMER: usize = 0x5951;
const HIDE_DELAY: Duration = Duration::from_millis(350);
const PANEL_DEFAULT: i32 = 1020;
const PANEL_MIN: i32 = 680;
const PILL_HEIGHT: i32 = 78; // 64 visible + 14 for the bottom shadow
const OLD_PILL_INSET: i32 = 10;
const STRIP: i32 = 6;
const SNAP: i32 = 12;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default)]
struct Preferences {
    // Read the 0.1.2 fallback for users who never explicitly changed their pin.
    overlay: bool,
    pinned: Option<bool>,
    positions: BTreeMap<String, (i32, i32)>, // historical pill coordinates in physical pixels
    panel: Option<Placement>,
    docked: bool,
    disable_top_hide: bool,
    expanded_height: Option<i32>,
    resume_after_pin: Option<Unpinned>,
}

#[derive(Clone, Serialize, Deserialize)]
struct Placement {
    display: String,
    // Logical offsets from the monitor work area, independent of its desktop origin.
    x: i32,
    y: i32,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ModeAction {
    Pin,
    Unpin,
    EnableTopHide,
    DisableTopHide,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
enum Unpinned {
    Floating,
    FloatingWithTopHideEnabled,
    Docked,
}

impl Preferences {
    fn unpinned_mode(&self) -> Unpinned {
        if self.disable_top_hide {
            Unpinned::Floating
        } else if self.docked {
            Unpinned::Docked
        } else {
            Unpinned::FloatingWithTopHideEnabled
        }
    }

    fn select_mode(&mut self, action: ModeAction) {
        let next = match action {
            ModeAction::Pin => {
                self.resume_after_pin = Some(self.unpinned_mode());
                Unpinned::Floating
            }
            ModeAction::Unpin => self.resume_after_pin.take().unwrap_or(Unpinned::Floating),
            ModeAction::EnableTopHide => match self.resume_after_pin.take() {
                Some(Unpinned::Docked) => Unpinned::Docked,
                _ => Unpinned::FloatingWithTopHideEnabled,
            },
            ModeAction::DisableTopHide => {
                self.resume_after_pin = None;
                Unpinned::Floating
            }
        };
        if self.docked && next != Unpinned::Docked {
            if let Some(panel) = self.panel.as_mut() {
                panel.y = 0;
            }
        }
        self.docked = next == Unpinned::Docked;
        self.pinned = Some(action == ModeAction::Pin);
        self.disable_top_hide = next == Unpinned::Floating;
    }

    fn moved_panel(&mut self) {
        if self.resume_after_pin == Some(Unpinned::Docked) {
            self.resume_after_pin = Some(Unpinned::FloatingWithTopHideEnabled);
        }
    }

    fn migrate_pin(&mut self) -> bool {
        if self.pinned.unwrap_or(self.overlay) && self.resume_after_pin.is_none() {
            self.select_mode(ModeAction::Pin);
            return true;
        }
        false
    }
}

thread_local! {
    static CONFIG: RefCell<(PathBuf, Preferences)> = RefCell::default();
    static PILL: Cell<bool> = const { Cell::new(false) };
    static FOLDED: Cell<bool> = const { Cell::new(false) };
    static DRAGGING: Cell<bool> = const { Cell::new(false) };
    static MOVE_START: Cell<Option<(i32, i32)>> = const { Cell::new(None) };
    static LAYOUT: Cell<bool> = const { Cell::new(false) };
    static TRACKING_NATIVE: Cell<bool> = const { Cell::new(false) };
    static OUTSIDE_SINCE: Cell<Option<Instant>> = const { Cell::new(None) };
    static RESIZE: Cell<Option<HeightDrag>> = const { Cell::new(None) };
}

#[derive(Clone, Copy)]
struct HeightDrag {
    bounds: RECT,
    start_y: i32,
    minimum: i32,
    maximum: i32,
    dpi: i32,
}

fn save() -> std::io::Result<()> {
    CONFIG.with_borrow(|(path, prefs)| {
        let tmp = path.with_extension("tmp");
        std::fs::write(&tmp, serde_json::to_vec(prefs)?)?;
        std::fs::rename(tmp, path)
    })
}
pub fn collapsed() -> bool {
    PILL.get()
}
pub fn pinned() -> bool {
    CONFIG.with_borrow(|(_, p)| p.pinned.unwrap_or(p.overlay))
}
pub fn enabled() -> bool {
    CONFIG.with_borrow(|(_, p)| !p.disable_top_hide)
}
fn at_edge() -> bool {
    !collapsed() && CONFIG.with_borrow(|(_, p)| p.docked && !p.disable_top_hide)
}
fn z_order() -> HWND {
    if collapsed() || at_edge() || pinned() {
        HWND_TOPMOST
    } else {
        HWND_NOTOPMOST
    }
}

struct Screen {
    name: String,
    monitor: RECT,
    work: RECT,
    dpi: i32,
}
impl Screen {
    fn read(handle: HMONITOR) -> Option<Self> {
        let mut info = MONITORINFOEXW::default();
        info.monitorInfo.cbSize = size_of::<MONITORINFOEXW>() as u32;
        if unsafe { GetMonitorInfoW(handle, &mut info.monitorInfo) } == 0 {
            return None;
        }
        let len = info
            .szDevice
            .iter()
            .position(|c| *c == 0)
            .unwrap_or(info.szDevice.len());
        let (mut x, mut y) = (96, 96);
        unsafe {
            GetDpiForMonitor(handle, MDT_EFFECTIVE_DPI, &mut x, &mut y);
        }
        Some(Self {
            name: String::from_utf16_lossy(&info.szDevice[..len]),
            monitor: info.monitorInfo.rcMonitor,
            work: info.monitorInfo.rcWork,
            dpi: x.max(96) as i32,
        })
    }
    fn pixels(&self, dip: i32) -> i32 {
        ((dip as i64 * self.dpi as i64 + 48) / 96).clamp(i32::MIN as i64, i32::MAX as i64) as i32
    }
    fn logical(&self, px: i32) -> i32 {
        ((px as i64 * 96 + self.dpi as i64 / 2) / self.dpi as i64) as i32
    }
}
fn current_screen(hwnd: HWND) -> Option<Screen> {
    Screen::read(unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) })
}
fn panel_screen(hwnd: HWND, saved: Option<&Placement>) -> Option<Screen> {
    let current = current_screen(hwnd)?;
    let Some(place) = saved.filter(|p| p.display != current.name) else {
        return Some(current);
    };
    // Enumeration is synchronous; the pointer remains valid only for this call.
    struct Search<'a> {
        name: &'a str,
        found: Option<Screen>,
    }
    unsafe extern "system" fn visit(h: HMONITOR, _: HDC, _: *mut RECT, data: LPARAM) -> i32 {
        let s = &mut *(data as *mut Search<'_>);
        if let Some(screen) = Screen::read(h).filter(|m| m.name == s.name) {
            s.found = Some(screen);
            return 0;
        }
        1
    }
    let mut search = Search {
        name: &place.display,
        found: None,
    };
    unsafe {
        EnumDisplayMonitors(
            std::ptr::null_mut(),
            std::ptr::null(),
            Some(visit),
            &mut search as *mut _ as isize,
        );
    }
    search.found.or(Some(current))
}

fn bounds(screen: &Screen, prefs: &Preferences, pill: bool, folded: bool) -> RECT {
    let w = screen.work;
    let width = screen
        .pixels(if pill { 424 } else { 400 })
        .min(w.right - w.left);
    let work_height = w.bottom - w.top;
    let natural_height = screen
        .pixels(if pill {
            PILL_HEIGHT
        } else {
            prefs
                .expanded_height
                .unwrap_or(PANEL_DEFAULT)
                .max(PANEL_MIN)
        })
        .min(work_height);
    let (mut x, mut y) = (
        w.right - width - screen.pixels(16),
        w.top + screen.pixels(20).min(work_height - natural_height),
    );
    if pill {
        let centered =
            screen.monitor.left + (screen.monitor.right - screen.monitor.left - width) / 2;
        (x, y) = prefs
            .positions
            .get(&screen.name)
            .map(|&(left, old_top)| (left, old_top.saturating_add(screen.pixels(OLD_PILL_INSET))))
            .filter(|&(left, top)| {
                left >= w.left
                    && left <= w.right - width
                    && top >= w.top
                    && top <= w.bottom - natural_height
            })
            .unwrap_or((centered, w.top));
    } else if let Some(place) = prefs.panel.as_ref().filter(|p| p.display == screen.name) {
        x = w.left.saturating_add(screen.pixels(place.x));
        y = w.top.saturating_add(screen.pixels(place.y));
    }
    x = x.clamp(w.left, w.right - width);
    let min_height = if pill {
        natural_height
    } else {
        screen.pixels(PANEL_MIN).min(natural_height)
    };
    y = y.clamp(w.top, w.bottom - min_height);
    let docked = !pill && prefs.docked && !prefs.disable_top_hide;
    if docked {
        y = w.top;
    }
    let h = if docked && folded {
        screen.pixels(STRIP)
    } else {
        natural_height
    };
    RECT {
        left: x,
        top: y,
        right: x + width,
        bottom: y + h.min(w.bottom - y),
    }
}

fn memory_inactive(hwnd: HWND) -> bool {
    FOLDED.get() || unsafe { IsIconic(hwnd) != 0 }
}

pub(super) fn sync_memory(hwnd: HWND) {
    super::webview_memory::update(hwnd, memory_inactive(hwnd));
}

fn layout(hwnd: HWND) -> Result<(), &'static str> {
    if DRAGGING.get() || RESIZE.get().is_some() || LAYOUT.replace(true) {
        return Ok(());
    }
    let result = (|| {
        let prefs = CONFIG.with_borrow(|(_, p)| p.clone());
        let screen = if collapsed() {
            current_screen(hwnd)
        } else {
            panel_screen(hwnd, prefs.panel.as_ref())
        }
        .ok_or("无法读取显示器工作区")?;
        let r = bounds(&screen, &prefs, collapsed(), FOLDED.get());
        if unsafe {
            SetWindowPos(
                hwnd,
                z_order(),
                r.left,
                r.top,
                r.right - r.left,
                r.bottom - r.top,
                SWP_NOACTIVATE,
            )
        } == 0
        {
            return Err("Windows 未能移动窗口");
        }
        sync_memory(hwnd);
        cancel_hide(hwnd);
        if at_edge() && !FOLDED.get() && cursor_inside(hwnd) == Some(false) {
            arm_hide(hwnd, Instant::now())?;
        }
        Ok(())
    })();
    LAYOUT.set(false);
    result
}

fn reveal(hwnd: HWND) -> Result<(), &'static str> {
    FOLDED.set(false);
    OUTSIDE_SINCE.set(None);
    layout(hwnd)
}

pub fn set_collapsed(hwnd: HWND, value: bool) -> Result<(), &'static str> {
    let previous = PILL.replace(value);
    if let Err(error) = reveal(hwnd) {
        PILL.set(previous);
        let _ = reveal(hwnd);
        return Err(error);
    }
    Ok(())
}
pub fn change_mode(
    hwnd: HWND,
    mode: ModeAction,
    sync_menu: impl Fn(bool) -> Result<(), &'static str>,
) -> Result<(), &'static str> {
    let previous = CONFIG.with_borrow_mut(|(_, p)| {
        let previous = p.clone();
        p.select_mode(mode);
        previous
    });
    let folded = FOLDED.get();
    let since = OUTSIDE_SINCE.get();
    let result = reveal(hwnd)
        .and_then(|()| sync_menu(enabled()))
        .and_then(|()| save().map_err(|_| "无法保存窗口模式"));
    if result.is_err() {
        CONFIG.with_borrow_mut(|(_, p)| *p = previous);
        FOLDED.set(folded);
        OUTSIDE_SINCE.set(since);
        let _ = layout(hwnd);
        let _ = sync_menu(enabled());
    }
    result
}
pub fn recall(hwnd: HWND) {
    let _ = reveal(hwnd);
}

fn finish_drag(hwnd: HWND, start: (i32, i32)) {
    let Some(screen) = current_screen(hwnd) else {
        return;
    };
    let mut r = RECT::default();
    if unsafe { GetWindowRect(hwnd, &mut r) } == 0 || start == (r.left, r.top) {
        return;
    }
    CONFIG.with_borrow_mut(|(_, p)| {
        if collapsed() {
            // Preserve the on-disk coordinate convention of the 0.1.5 host.
            p.positions.insert(
                screen.name.clone(),
                (r.left, r.top - screen.pixels(OLD_PILL_INSET)),
            );
        } else {
            p.moved_panel();
            p.docked = !p.disable_top_hide && r.top <= screen.work.top + screen.pixels(SNAP);
            p.panel = Some(Placement {
                display: screen.name.clone(),
                x: screen.logical((r.left - screen.work.left).max(0)),
                y: screen.logical((r.top - screen.work.top).max(0)),
            });
        }
    });
    let _ = reveal(hwnd);
    let _ = save();
}

fn cursor_inside(hwnd: HWND) -> Option<bool> {
    let (mut p, mut r) = (POINT::default(), RECT::default());
    if unsafe { GetCursorPos(&mut p) } == 0 || unsafe { GetWindowRect(hwnd, &mut r) } == 0 {
        return None;
    }
    Some(p.x >= r.left && p.x < r.right && p.y >= r.top && p.y < r.bottom)
}

fn cancel_hide(hwnd: HWND) {
    OUTSIDE_SINCE.set(None);
    unsafe { KillTimer(hwnd, EDGE_TIMER) };
}

fn arm_hide(hwnd: HWND, since: Instant) -> Result<(), &'static str> {
    let remaining = HIDE_DELAY.saturating_sub(since.elapsed());
    let milliseconds = remaining.as_millis() as u32 + 1;
    if unsafe { SetTimer(hwnd, EDGE_TIMER, milliseconds, None) } == 0 {
        return Err("无法启用贴顶隐藏");
    }
    OUTSIDE_SINCE.set(Some(since));
    Ok(())
}

fn hover_active(hwnd: HWND) -> bool {
    !DRAGGING.get()
        && RESIZE.get().is_none()
        && !LAYOUT.get()
        && at_edge()
        && unsafe { IsIconic(hwnd) } == 0
}

pub fn pointer_boundary(hwnd: HWND, entered: bool) {
    if !hover_active(hwnd) {
        return;
    }
    match cursor_inside(hwnd) {
        Some(true) if entered => {
            cancel_hide(hwnd);
            if FOLDED.get() {
                let _ = reveal(hwnd);
            }
        }
        Some(false) if !entered && !FOLDED.get() && OUTSIDE_SINCE.get().is_none() => {
            let _ = arm_hide(hwnd, Instant::now());
        }
        _ => {}
    }
}

fn hide_deadline(hwnd: HWND) {
    let since = OUTSIDE_SINCE.get();
    cancel_hide(hwnd);
    let Some(since) = since else { return };
    if !hover_active(hwnd) || FOLDED.get() || cursor_inside(hwnd) != Some(false) {
        return;
    }
    if since.elapsed() < HIDE_DELAY {
        let _ = arm_hide(hwnd, since);
        return;
    }
    FOLDED.set(true);
    if layout(hwnd).is_err() {
        FOLDED.set(false);
    }
}

impl HeightDrag {
    fn height(self, delta: i32) -> i32 {
        (self.bounds.bottom - self.bounds.top)
            .saturating_add(delta)
            .clamp(self.minimum, self.maximum)
    }
    fn apply(self, hwnd: HWND, height: i32) -> bool {
        unsafe {
            SetWindowPos(
                hwnd,
                std::ptr::null_mut(),
                0,
                0,
                self.bounds.right - self.bounds.left,
                height,
                SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
            ) != 0
        }
    }
    fn remember(self, hwnd: HWND, height: i32) -> Result<(), &'static str> {
        if height == self.bounds.bottom - self.bounds.top {
            return Ok(());
        }
        let logical = ((height as i64 * 96 + self.dpi as i64 / 2) / self.dpi as i64) as i32;
        let previous =
            CONFIG.with_borrow_mut(|(_, p)| p.expanded_height.replace(logical.max(PANEL_MIN)));
        if save().is_err() {
            CONFIG.with_borrow_mut(|(_, p)| p.expanded_height = previous);
            let _ = layout(hwnd);
            return Err("无法保存窗口高度");
        }
        Ok(())
    }
}

pub fn resize_panel(hwnd: HWND, step: Option<i32>) -> Result<(), &'static str> {
    if collapsed() || FOLDED.get() || DRAGGING.get() || RESIZE.get().is_some() {
        return Err("当前窗口状态无法调高");
    }
    let screen = current_screen(hwnd).ok_or("无法读取显示器工作区")?;
    let mut bounds = RECT::default();
    let mut cursor = POINT::default();
    if unsafe { GetWindowRect(hwnd, &mut bounds) } == 0 || unsafe { GetCursorPos(&mut cursor) } == 0
    {
        return Err("无法读取窗口位置");
    }
    let maximum = (screen.work.bottom - bounds.top).max(1);
    let drag = HeightDrag {
        bounds,
        start_y: cursor.y,
        dpi: screen.dpi,
        maximum,
        minimum: screen.pixels(PANEL_MIN).min(maximum),
    };
    if let Some(direction) = step {
        if !matches!(direction, -1 | 1) {
            return Err("无效的调整方向");
        }
        let height = drag.height(direction * screen.pixels(16));
        if !drag.apply(hwnd, height) {
            return Err("无法调整窗口高度");
        }
        return drag.remember(hwnd, height);
    }
    if unsafe { GetAsyncKeyState(VK_LBUTTON as i32) } >= 0 {
        return Ok(());
    }
    unsafe {
        SetCapture(hwnd);
    }
    if unsafe { GetCapture() } != hwnd {
        return Err("无法开始调整窗口高度");
    }
    cancel_hide(hwnd);
    RESIZE.set(Some(drag));
    Ok(())
}

fn resize_to_pointer(hwnd: HWND, drag: HeightDrag) -> Option<i32> {
    let mut cursor = POINT::default();
    if unsafe { GetCursorPos(&mut cursor) } == 0 {
        return None;
    }
    let height = drag.height(cursor.y - drag.start_y);
    drag.apply(hwnd, height).then_some(height)
}

fn end_resize(hwnd: HWND, commit: bool) {
    let Some(drag) = RESIZE.take() else {
        return;
    };
    if unsafe { GetCapture() } == hwnd {
        unsafe {
            ReleaseCapture();
        }
    }
    if commit {
        if let Some(height) = resize_to_pointer(hwnd, drag) {
            let _ = drag.remember(hwnd, height);
        }
    }
    let _ = reveal(hwnd);
}

pub fn install(hwnd: HWND, dir: PathBuf) -> Result<bool, &'static str> {
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("window.json");
    let mut prefs: Preferences = std::fs::read(&path)
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default();
    let migrated = prefs.migrate_pin();
    CONFIG.with_borrow_mut(|c| *c = (path, prefs));
    if migrated {
        let _ = save();
    }
    if unsafe { SetWindowSubclass(hwnd, Some(messages), 1, 0) } == 0 {
        return Err("无法安装窗口处理器");
    }
    layout(hwnd)?;
    Ok(enabled())
}

unsafe extern "system" fn messages(
    hwnd: HWND,
    msg: u32,
    w: WPARAM,
    l: LPARAM,
    id: usize,
    _: usize,
) -> LRESULT {
    match msg {
        WM_MOUSEMOVE if RESIZE.get().is_some() => {
            if let Some(drag) = RESIZE.get() {
                resize_to_pointer(hwnd, drag);
            }
            return 0;
        }
        WM_MOUSEMOVE if hover_active(hwnd) => {
            if !TRACKING_NATIVE.get() {
                let mut tracking = TRACKMOUSEEVENT {
                    cbSize: size_of::<TRACKMOUSEEVENT>() as u32,
                    dwFlags: TME_LEAVE,
                    hwndTrack: hwnd,
                    dwHoverTime: 0,
                };
                TRACKING_NATIVE.set(TrackMouseEvent(&mut tracking) != 0);
            }
            pointer_boundary(hwnd, true);
        }
        WM_MOUSELEAVE => {
            TRACKING_NATIVE.set(false);
            pointer_boundary(hwnd, false);
        }
        WM_LBUTTONUP if RESIZE.get().is_some() => {
            end_resize(hwnd, true);
            return 0;
        }
        WM_CAPTURECHANGED | WM_CANCELMODE if RESIZE.get().is_some() => {
            end_resize(hwnd, false);
        }
        WM_ENTERSIZEMOVE => {
            cancel_hide(hwnd);
            DRAGGING.set(true);
            let mut r = RECT::default();
            MOVE_START.set((GetWindowRect(hwnd, &mut r) != 0).then_some((r.left, r.top)));
        }
        WM_EXITSIZEMOVE => {
            DRAGGING.set(false);
            if let Some(start) = MOVE_START.take() {
                finish_drag(hwnd, start);
            }
        }
        WM_SIZE => sync_memory(hwnd),
        WM_TIMER if w == super::webview_memory::TIMER => {
            super::webview_memory::deadline(hwnd, memory_inactive(hwnd));
            return 0;
        }
        WM_TIMER if w == EDGE_TIMER => {
            hide_deadline(hwnd);
            return 0;
        }
        WM_DPICHANGED | WM_DISPLAYCHANGE | WM_SETTINGCHANGE if !LAYOUT.get() && !DRAGGING.get() => {
            end_resize(hwnd, false);
            PostMessageW(hwnd, REFLOW, 0, 0);
        }
        REFLOW => {
            let _ = layout(hwnd);
            return 0;
        }
        WM_DESTROY => {
            super::webview_memory::detach(hwnd);
            RESIZE.set(None);
            KillTimer(hwnd, EDGE_TIMER);
        }
        WM_NCDESTROY => {
            RemoveWindowSubclass(hwnd, Some(messages), id);
        }
        _ => {}
    }
    DefSubclassProc(hwnd, msg, w, l)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unpin_restores_position_mode_including_across_restart() {
        for original in [
            Unpinned::Floating,
            Unpinned::FloatingWithTopHideEnabled,
            Unpinned::Docked,
        ] {
            for moved in [false, true] {
                let mut p = Preferences {
                    disable_top_hide: original == Unpinned::Floating,
                    docked: original == Unpinned::Docked,
                    panel: Some(Placement {
                        display: "screen".into(),
                        x: 182,
                        y: 2,
                    }),
                    ..Default::default()
                };
                p.select_mode(ModeAction::Pin);
                assert!(p.disable_top_hide && !p.docked && p.pinned == Some(true));
                if moved {
                    p.moved_panel();
                    p.panel.as_mut().unwrap().y = 84;
                }
                let mut restored: Preferences =
                    serde_json::from_slice(&serde_json::to_vec(&p).unwrap()).unwrap();
                assert!(!restored.migrate_pin());
                restored.select_mode(ModeAction::Unpin);
                assert_eq!(
                    restored.unpinned_mode(),
                    if moved && original == Unpinned::Docked {
                        Unpinned::FloatingWithTopHideEnabled
                    } else {
                        original
                    }
                );
                assert_eq!(restored.pinned, Some(false));
                if moved {
                    assert_eq!(restored.panel.unwrap().y, 84);
                }
                assert!(restored.resume_after_pin.is_none());
            }
        }
    }
    #[test]
    fn explicit_tray_selection_replaces_the_pin() {
        let mut p = Preferences {
            disable_top_hide: true,
            ..Default::default()
        };
        p.select_mode(ModeAction::Pin);
        p.select_mode(ModeAction::EnableTopHide);
        assert_eq!(p.unpinned_mode(), Unpinned::FloatingWithTopHideEnabled);
        assert_eq!(p.pinned, Some(false));
        assert!(p.resume_after_pin.is_none());
        p.docked = true;
        p.select_mode(ModeAction::DisableTopHide);
        assert_eq!(p.unpinned_mode(), Unpinned::Floating);
    }
    #[test]
    fn upgrading_conflicting_preferences_gives_priority_to_an_existing_pin() {
        let mut p: Preferences =
            serde_json::from_str(r#"{"pinned":true,"docked":true,"expanded_height":720}"#).unwrap();
        assert!(p.migrate_pin());
        assert!(p.disable_top_hide && !p.docked);
        assert_eq!(p.expanded_height, Some(720));
        assert!(!p.migrate_pin());
        let mut default = Preferences::default();
        assert!(!default.migrate_pin());
        assert!(!default.disable_top_hide);
    }
    #[test]
    fn old_preferences_load_without_docking_and_keep_the_pin() {
        let p: Preferences =
            serde_json::from_str(r#"{"overlay":true,"positions":{"screen":[9,12]}}"#).unwrap();
        assert!(!p.docked && !p.disable_top_hide && p.pinned.unwrap_or(p.overlay));
        assert_eq!(p.positions["screen"], (9, 12));
    }
    #[test]
    fn strip_and_panel_fit_the_same_work_area_at_150_percent() {
        let s = Screen {
            name: "left".into(),
            monitor: RECT {
                left: -1920,
                top: 0,
                right: 0,
                bottom: 1080,
            },
            work: RECT {
                left: -1920,
                top: 40,
                right: 0,
                bottom: 1080,
            },
            dpi: 144,
        };
        let mut p = Preferences {
            panel: Some(Placement {
                display: "left".into(),
                x: 1200,
                y: 570,
            }),
            ..Default::default()
        };
        let free = bounds(&s, &p, false, false);
        assert_eq!((free.right, free.bottom), (0, 1080));
        p.docked = true;
        let open = bounds(&s, &p, false, false);
        let strip = bounds(&s, &p, false, true);
        assert_eq!((strip.left, strip.top, strip.bottom), (open.left, 40, 49));
        assert_eq!(open.bottom, 1080);
    }

    #[test]
    fn preferred_height_and_pill_alignment_follow_each_monitor() {
        for dpi in [96, 120, 144] {
            let mut s = Screen {
                name: "secondary".into(),
                monitor: RECT {
                    left: -2400,
                    top: -100,
                    right: -400,
                    bottom: 1900,
                },
                work: RECT {
                    left: -2330,
                    top: -40,
                    right: -400,
                    bottom: 1800,
                },
                dpi,
            };
            let mut p = Preferences::default();
            let r = bounds(&s, &p, false, false);
            assert_eq!(r.bottom - r.top, s.pixels(1020));
            let pill = bounds(&s, &p, true, false);
            assert!(((pill.left + pill.right) - (s.monitor.left + s.monitor.right)).abs() <= 1);
            assert_eq!(pill.top, s.work.top);
            p.positions.insert(s.name.clone(), (-2050, 200));
            assert_eq!(bounds(&s, &p, true, false).top, 200 + s.pixels(10));
            p.positions.insert(s.name.clone(), (4000, 4000));
            assert!(same_position(bounds(&s, &p, true, false), pill));
            p.expanded_height = Some(800);
            for height in [1100, 900, 620] {
                s.work.bottom = s.work.top + s.pixels(height);
                let r = bounds(&s, &p, false, false);
                assert_eq!(r.bottom - r.top, s.pixels(height.min(800)));
                let fresh = bounds(&s, &Preferences::default(), false, false);
                assert_eq!(fresh.bottom - fresh.top, s.pixels(height.min(1020)));
                if height <= 1020 {
                    assert_eq!(fresh.top, s.work.top);
                }
            }
            s.work.bottom = 1800;
            assert_eq!(
                bounds(&s, &p, false, false).bottom - bounds(&s, &p, false, false).top,
                s.pixels(800)
            );
        }
    }
    fn same_position(a: RECT, b: RECT) -> bool {
        a.left == b.left && a.top == b.top
    }
}
