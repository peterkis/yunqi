use std::{ffi::c_void, io, mem, ptr};
use tokio::sync::watch;
use windows_sys::Win32::{
    Foundation::{CloseHandle, FILETIME, HWND, LPARAM, LRESULT, WAIT_OBJECT_0, WPARAM},
    System::{
        RemoteDesktop::{
            WTSRegisterSessionNotification, WTSUnRegisterSessionNotification,
            NOTIFY_FOR_THIS_SESSION,
        },
        SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX},
        Threading::{GetSystemTimes, OpenProcess, WaitForSingleObject, PROCESS_SYNCHRONIZE},
    },
    UI::{
        Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass},
        WindowsAndMessaging::{
            WM_NCDESTROY, WM_WTSSESSION_CHANGE, WTS_CONSOLE_DISCONNECT, WTS_REMOTE_DISCONNECT,
            WTS_SESSION_LOCK, WTS_SESSION_LOGOFF, WTS_SESSION_UNLOCK,
        },
    },
};

unsafe extern "system" fn session_event(
    hwnd: HWND,
    message: u32,
    value: WPARAM,
    extra: LPARAM,
    id: usize,
    reference: usize,
) -> LRESULT {
    let locked = reference as *mut watch::Sender<bool>;
    if message == WM_WTSSESSION_CHANGE {
        match value as u32 {
            WTS_SESSION_LOCK => {
                (*locked).send_replace(true);
            }
            WTS_SESSION_UNLOCK
            | WTS_SESSION_LOGOFF
            | WTS_CONSOLE_DISCONNECT
            | WTS_REMOTE_DISCONNECT => {
                (*locked).send_replace(false);
            }
            _ => {}
        }
    } else if message == WM_NCDESTROY {
        RemoveWindowSubclass(hwnd, Some(session_event), id);
        WTSUnRegisterSessionNotification(hwnd);
        let sender = Box::from_raw(locked);
        sender.send_replace(false);
    }
    DefSubclassProc(hwnd, message, value, extra)
}

pub fn watch_lock(hwnd: *mut c_void) -> io::Result<watch::Receiver<bool>> {
    let (sender, receiver) = watch::channel(false);
    // The subclass owns the sender until WM_NCDESTROY on the window's thread.
    unsafe {
        if WTSRegisterSessionNotification(hwnd, NOTIFY_FOR_THIS_SESSION) == 0 {
            return Err(io::Error::last_os_error());
        }
        let sender = Box::into_raw(Box::new(sender));
        if SetWindowSubclass(hwnd, Some(session_event), 1, sender as usize) == 0 {
            WTSUnRegisterSessionNotification(hwnd);
            drop(Box::from_raw(sender));
            return Err(io::Error::last_os_error());
        }
    }
    Ok(receiver)
}

fn ticks(time: FILETIME) -> u64 {
    (u64::from(time.dwHighDateTime) << 32) | u64::from(time.dwLowDateTime)
}

pub fn cpu_times() -> Option<(u64, u64)> {
    let (mut idle, mut kernel, mut user) = (
        FILETIME::default(),
        FILETIME::default(),
        FILETIME::default(),
    );
    if unsafe { GetSystemTimes(&mut idle, &mut kernel, &mut user) } == 0 {
        return None;
    }
    Some((ticks(idle), ticks(kernel).checked_add(ticks(user))?))
}

pub fn resources_available(previous: (u64, u64), current: (u64, u64)) -> bool {
    let idle = current.0.saturating_sub(previous.0);
    let total = current.1.saturating_sub(previous.1);
    let mut memory = MEMORYSTATUSEX {
        dwLength: mem::size_of::<MEMORYSTATUSEX>() as u32,
        ..Default::default()
    };
    total > 0
        && idle as f64 / total as f64 >= 0.70
        && unsafe { GlobalMemoryStatusEx(&mut memory) } != 0
        && memory.ullAvailPhys >= (1024 * 1024 * 1024).max(memory.ullTotalPhys / 10)
}

pub fn open_parent(pid: u32) -> io::Result<*mut c_void> {
    let process = unsafe { OpenProcess(PROCESS_SYNCHRONIZE, 0, pid) };
    if process == ptr::null_mut() {
        return Err(io::Error::last_os_error());
    }
    Ok(process)
}

pub fn wait_parent(process: *mut c_void) -> bool {
    let result = unsafe { WaitForSingleObject(process, 35000) };
    unsafe { CloseHandle(process) };
    result == WAIT_OBJECT_0
}
