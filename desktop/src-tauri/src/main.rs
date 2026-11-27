#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod dock;
mod service;
mod update;
mod update_protocol;
mod update_windows;
mod webview_memory;

use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewWindow,
};

struct EdgeMenu(CheckMenuItem<tauri::Wry>);

fn change_mode(window: &WebviewWindow, mode: dock::ModeAction) -> Result<(), &'static str> {
    let menu = window.try_state::<EdgeMenu>().ok_or("窗口菜单尚未就绪")?;
    dock::change_mode(
        window.hwnd().map_err(|_| "无法读取窗口")?.0,
        mode,
        |enabled| menu.0.set_checked(enabled).map_err(|_| "无法更新窗口菜单"),
    )
}

#[tauri::command]
async fn set_collapsed(window: WebviewWindow, collapsed: bool) -> Result<(), &'static str> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let target = window.clone();
    window
        .run_on_main_thread(move || {
            let result = target
                .hwnd()
                .map_err(|_| "无法读取侧栏窗口")
                .and_then(|hwnd| dock::set_collapsed(hwnd.0, collapsed));
            if result.is_ok() {
                let _ = target.set_skip_taskbar(collapsed);
            }
            let _ = tx.send(result);
        })
        .map_err(|_| "窗口无法响应")?;
    rx.await.map_err(|_| "窗口已关闭")?
}

#[tauri::command]
async fn window_pin(window: WebviewWindow, pinned: Option<bool>) -> Result<bool, &'static str> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let target = window.clone();
    window
        .run_on_main_thread(move || {
            let result = (|| {
                if let Some(value) = pinned {
                    if value != dock::pinned() {
                        change_mode(
                            &target,
                            if value {
                                dock::ModeAction::Pin
                            } else {
                                dock::ModeAction::Unpin
                            },
                        )?;
                    }
                }
                Ok(dock::pinned())
            })();
            let _ = tx.send(result);
        })
        .map_err(|_| "窗口无法响应")?;
    rx.await.map_err(|_| "窗口已关闭")?
}

#[tauri::command]
async fn resize_panel_height(window: WebviewWindow, step: Option<i32>) -> Result<(), &'static str> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let target = window.clone();
    window
        .run_on_main_thread(move || {
            let result = target
                .hwnd()
                .map_err(|_| "无法读取窗口")
                .and_then(|h| dock::resize_panel(h.0, step));
            let _ = tx.send(result);
        })
        .map_err(|_| "窗口无法响应")?;
    rx.await.map_err(|_| "窗口已关闭")?
}

#[tauri::command]
fn drag_window(window: WebviewWindow) {
    let target = window.clone();
    let _ = window.run_on_main_thread(move || {
        let _ = target.start_dragging();
    });
}

#[tauri::command]
fn edge_pointer_boundary(window: WebviewWindow, entered: bool) {
    let target = window.clone();
    let _ = window.run_on_main_thread(move || {
        if let Ok(hwnd) = target.hwnd() {
            dock::pointer_boundary(hwnd.0, entered);
        }
    });
}

fn main() {
    if update::handle_helper() || update::installing() {
        return;
    }
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let target = window.clone();
                let _ = window.run_on_main_thread(move || {
                    if let Ok(hwnd) = target.hwnd() {
                        dock::recall(hwnd.0);
                    }
                });
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .on_page_load(|webview, payload| {
            if webview.label() == "main"
                && payload.event() == tauri::webview::PageLoadEvent::Finished
            {
                let _ = webview.eval(include_str!("edge-pointer.js"));
            }
        })
        .invoke_handler(tauri::generate_handler![
            service::calculate,
            set_collapsed,
            window_pin,
            resize_panel_height,
            drag_window,
            edge_pointer_boundary,
            update::update_status,
            update::update_action
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").ok_or("侧栏窗口未创建")?;
            let edge_enabled = dock::install(window.hwnd()?.0, app.path().app_config_dir()?)?;
            webview_memory::install(&window);
            app.manage(service::Service::new());
            let mode = CheckMenuItem::with_id(
                app,
                "edge",
                "允许贴顶自动隐藏",
                true,
                edge_enabled,
                None::<&str>,
            )?;
            let quit = MenuItem::with_id(app, "quit", "退出运气通", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&mode, &quit])?;
            app.manage(EdgeMenu(mode));
            TrayIconBuilder::new()
                .tooltip("运气通 · 离线侧栏")
                .icon(app.default_window_icon().ok_or("缺少程序图标")?.clone())
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "edge" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let target = w.clone();
                            let _ = w.run_on_main_thread(move || {
                                let next = if dock::enabled() {
                                    dock::ModeAction::DisableTopHide
                                } else {
                                    dock::ModeAction::EnableTopHide
                                };
                                let _ = change_mode(&target, next);
                                let _ =
                                    target.emit_to("main", "window-pin-changed", dock::pinned());
                            });
                        }
                    }
                    "quit" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.close();
                        }
                    }
                    _ => {}
                })
                .build(app)?;
            if !update::start(&window) {
                window.show()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!());
    if result.is_err() {
        use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR};
        let message: Vec<u16> = "侧栏启动失败，请检查 WebView2 运行时和安装文件。\0"
            .encode_utf16()
            .collect();
        let title: Vec<u16> = "运气通\0".encode_utf16().collect();
        unsafe {
            MessageBoxW(
                std::ptr::null_mut(),
                message.as_ptr(),
                title.as_ptr(),
                MB_ICONERROR,
            );
        }
    }
}
