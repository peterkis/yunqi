//! Windows WebView2 memory hints for an inactive sidebar. All state lives on the HWND thread.
use std::{
    cell::{Cell, RefCell},
    time::{Duration, Instant},
};
use tauri::WebviewWindow;
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
    COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
};
use windows_core::Interface;
use windows_sys::Win32::{
    Foundation::HWND,
    UI::WindowsAndMessaging::{KillTimer, SetTimer},
};

pub const TIMER: usize = 0x5952;
const IDLE_DELAY: Duration = Duration::from_secs(10);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum State {
    Normal,
    Waiting(Instant),
    Low,
}

impl State {
    fn requested(self, inactive: bool, supported: bool, now: Instant) -> Self {
        if !inactive || !supported {
            return Self::Normal;
        }
        match self {
            Self::Normal => Self::Waiting(now),
            Self::Waiting(since) if now.saturating_duration_since(since) >= IDLE_DELAY => Self::Low,
            state => state,
        }
    }
}

thread_local! {
    static VIEW: RefCell<Option<ICoreWebView2_19>> = const { RefCell::new(None) };
    static STATE: Cell<State> = const { Cell::new(State::Normal) };
    static APPLIED_LOW: Cell<bool> = const { Cell::new(false) };
    static IN_SETTER: Cell<bool> = const { Cell::new(false) };
}

pub fn install(window: &WebviewWindow) {
    let target = window.clone();
    let _ = window.with_webview(move |platform| {
        // Older installed runtimes can lack ICoreWebView2_19. Docking remains available.
        // SAFETY: with_webview runs on the controller’s owning UI thread;
        // platform and its owned controller reference remain live for this call.
        let view = unsafe { platform.controller().CoreWebView2() }
            .and_then(|core| core.cast::<ICoreWebView2_19>())
            .ok();
        VIEW.replace(view);
        APPLIED_LOW.set(false);
        if let Ok(hwnd) = target.hwnd() {
            super::dock::sync_memory(hwnd.0);
        }
    });
}

fn apply_requested_level() {
    if APPLIED_LOW.get() == (STATE.get() == State::Low) || IN_SETTER.replace(true) {
        return;
    }
    // A COM call can pump another native message. Nested calls update STATE;
    // this invocation applies the latest request once the current setter finishes.
    loop {
        let low = STATE.get() == State::Low;
        if APPLIED_LOW.get() == low {
            break;
        }
        let Some(view) = VIEW.with_borrow(Clone::clone) else {
            break;
        };
        let level = if low {
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW
        } else {
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL
        };
        // SAFETY: the subclass, timer and controller share the owning UI thread.
        // The local COM reference keeps the view alive across message dispatch.
        let ok = unsafe { view.SetMemoryUsageTargetLevel(level) }.is_ok();
        if !VIEW.with_borrow(|current| current.as_ref() == Some(&view)) {
            continue; // An old controller's result does not describe its replacement.
        }
        if !ok {
            // Keep the last applied level so a subsequent window event can retry.
            break;
        }
        APPLIED_LOW.set(low);
    }
    IN_SETTER.set(false);
}

pub fn update(hwnd: HWND, inactive: bool) {
    let previous = STATE.get();
    let next = previous.requested(inactive, VIEW.with_borrow(Option::is_some), Instant::now());
    if previous != next {
        if matches!(next, State::Waiting(_)) {
            if unsafe { SetTimer(hwnd, TIMER, IDLE_DELAY.as_millis() as u32, None) } == 0 {
                return;
            }
        } else if matches!(previous, State::Waiting(_)) {
            unsafe { KillTimer(hwnd, TIMER) };
        }
        STATE.set(next);
    }
    apply_requested_level();
}

pub fn deadline(hwnd: HWND, inactive: bool) {
    // A queued timer may outlive KillTimer. An old one cannot start a wait,
    // and requested() checks the current wait's start before asking for LOW.
    if matches!(STATE.get(), State::Waiting(_)) {
        update(hwnd, inactive);
    }
}

pub fn detach(hwnd: HWND) {
    unsafe { KillTimer(hwnd, TIMER) };
    STATE.set(State::Normal);
    VIEW.take();
    APPLIED_LOW.set(false);
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn brief_fold_and_stale_timer_cannot_lower_a_reopened_or_newly_folded_view() {
        let start = Instant::now();
        let reopened = start + IDLE_DELAY / 2;
        let refolded = reopened + Duration::from_secs(1);
        let first = State::Normal.requested(true, true, start);
        let normal = first.requested(false, true, reopened);
        assert_eq!(normal, State::Normal);
        let second = normal.requested(true, true, refolded);
        assert_eq!(second, State::Waiting(refolded));
        assert_eq!(second.requested(true, true, start + IDLE_DELAY), second);
        let low = second.requested(true, true, refolded + IDLE_DELAY);
        assert_eq!(low, State::Low);
        assert_eq!(
            low.requested(false, true, refolded + IDLE_DELAY),
            State::Normal
        );
    }

    #[test]
    fn runtime_without_memory_interface_never_requests_low() {
        let now = Instant::now();
        assert_eq!(State::Normal.requested(true, false, now), State::Normal);
        assert_eq!(
            State::Waiting(now).requested(true, false, now + IDLE_DELAY),
            State::Normal
        );
        assert_eq!(State::Low.requested(true, false, now), State::Normal);
    }
}
