"""Compare packaged Windows builds at fixed elapsed times, without attaching a debugger."""
import argparse
from collections import Counter
from contextlib import ExitStack
import ctypes as C
from ctypes import wintypes as W
import hashlib
import importlib.util
import json
import os
import platform
from datetime import datetime, timezone
from pathlib import Path
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time

here = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("windows_process_tree", here / "windows-process-tree.py")
tree = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tree)
win = C.WinDLL("user32", use_last_error=True)
callback = C.WINFUNCTYPE(W.BOOL, W.HWND, W.LPARAM)
win.GetWindowThreadProcessId.argtypes = (W.HWND, C.POINTER(W.DWORD))
win.GetClassNameW.argtypes = (W.HWND, W.LPWSTR, C.c_int)
win.IsWindowVisible.argtypes = (W.HWND,)
win.GetCursorPos.argtypes = (C.POINTER(W.POINT),)
win.SetCursorPos.argtypes = (C.c_int, C.c_int)
win.GetWindowRect.argtypes = (W.HWND, C.POINTER(W.RECT))
win.ShowWindowAsync.argtypes = (W.HWND, C.c_int)
win.IsIconic.argtypes = (W.HWND,)
win.GetForegroundWindow.restype = W.HWND
win.PostMessageW.argtypes = (W.HWND, W.UINT, W.WPARAM, W.LPARAM)
wait_for_exit = tree.api("WaitForSingleObject", W.DWORD, W.HANDLE, W.DWORD)
win.EnumChildWindows.argtypes = (W.HWND, callback, W.LPARAM)
win.EnumWindows.argtypes = (callback, W.LPARAM)


def class_name(hwnd):
    buf = C.create_unicode_buffer(256)
    win.GetClassNameW(hwnd, buf, len(buf))
    return buf.value


def windows(owned):
    result = []

    @callback
    def top(hwnd, _):
        pid = W.DWORD()
        win.GetWindowThreadProcessId(hwnd, C.byref(pid))
        if pid.value in owned and win.IsWindowVisible(hwnd):
            children = Counter()

            @callback
            def child(handle, _):
                children[class_name(handle)] += 1
                return True

            win.EnumChildWindows(hwnd, child, 0)
            rect = W.RECT()
            if not win.GetWindowRect(hwnd, C.byref(rect)):
                raise C.WinError(C.get_last_error())
            result.append({"pid": pid.value, "hwnd": hwnd, "class": class_name(hwnd),
                           "size": [rect.right - rect.left, rect.bottom - rect.top],
                           "childClasses": dict(children)})
        return True

    if not win.EnumWindows(top, 0):
        raise C.WinError(C.get_last_error())
    return result


def browser_roles(rows):
    webviews = [r for r in rows if r["name"].lower() == "msedgewebview2.exe"]
    if not webviews:
        return []
    ids = [row["pid"] for row in webviews]
    where = " OR ".join(f"ProcessId={pid}" for pid in ids)
    cmd = (f"@(Get-CimInstance Win32_Process -Filter '{where}' | "
           "Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress")
    with ExitStack() as cleanup:
        # Keep each verified process object alive across the PID-based CIM call.
        for row in webviews:
            handle = tree.open_sampled(row, 0)
            if not handle:
                raise RuntimeError("WebView2 process changed before role inspection")
            cleanup.callback(tree.close, handle)
        items = json.loads(subprocess.check_output(["powershell.exe", "-NoProfile", "-Command", cmd]))
    result = []
    for item in items if isinstance(items, list) else [items]:
        args = item["CommandLine"]
        if not args:
            raise RuntimeError("Cannot read the owned WebView2 process command line")
        kind = re.search(r'--type=([^\s"]+)', args)
        subtype = re.search(r'--utility-sub-type=([^\s"]+)', args)
        debug = re.findall(r'--(?:remote-debugging-[\w-]+|auto-open-devtools-for-tabs)\b', args)
        result.append({"pid": item["ProcessId"], "role": kind[1] if kind else "browser",
                       "subtype": subtype[1] if subtype else None, "debugSwitches": debug})
    if {r["pid"] for r in result} != set(ids):
        raise RuntimeError("WebView2 tree changed during role inspection")
    return result


def check_single_instance(exe, env, proc):
    def main_windows():
        return [w for w in windows({proc.pid}) if w["class"] == "Tauri Window"]

    before = main_windows()
    if len(before) != 1:
        raise RuntimeError("Expected one main window before second launch")
    hwnd = before[0]["hwnd"]
    win.ShowWindowAsync(hwnd, 6)  # SW_MINIMIZE
    deadline = time.monotonic() + 3
    while not win.IsIconic(hwnd) and time.monotonic() < deadline:
        time.sleep(0.05)
    if not win.IsIconic(hwnd):
        raise RuntimeError("Failed to minimize the owned window")
    second = subprocess.run([str(exe)], cwd=exe.parent, env=env, timeout=10)
    deadline = time.monotonic() + 5
    while win.IsIconic(hwnd) and time.monotonic() < deadline:
        time.sleep(0.05)
    after = main_windows()
    restored = not win.IsIconic(hwnd)
    foreground = win.GetForegroundWindow() == hwnd
    rows = tree.sample(proc.pid)
    handles = {r["pid"]: handle for r in rows if (handle := tree.open_sampled(r, 0x00100000))}
    try:
        if not win.PostMessageW(hwnd, 0x0010, 0, 0):  # WM_CLOSE
            raise C.WinError(C.get_last_error())
        proc.wait(timeout=12)
        deadline = time.monotonic() + 10
        remaining = [pid for pid, handle in handles.items()
                     if wait_for_exit(handle, max(0, int(1000 * (deadline - time.monotonic())))) != 0]
    finally:
        for handle in handles.values():
            if handle:
                tree.close(handle)
    return {"secondExitCode": second.returncode, "originalMainWindowReused":
            [w["hwnd"] for w in after] == [hwnd], "restored": restored,
            "foreground": foreground, "rolesAfterSecond": [r["name"] for r in rows],
            "remainingPidsAfterNormalClose": remaining}


def cursor_pos():
    point = W.POINT()
    if not win.GetCursorPos(C.byref(point)):
        raise C.WinError(C.get_last_error())
    return point.x, point.y


def hover_panel(pid, deadline):
    while time.perf_counter() < deadline:
        candidates = [w for w in windows({pid}) if w["class"] == "Tauri Window"
                      and w["childClasses"].get("WRY_WEBVIEW") == 1]
        if len(candidates) == 1:
            rect = W.RECT()
            if not win.GetWindowRect(candidates[0]["hwnd"], C.byref(rect)):
                raise C.WinError(C.get_last_error())
            target = (rect.left + (rect.right - rect.left) // 2, rect.top + 2)
            if not win.SetCursorPos(*target):
                raise C.WinError(C.get_last_error())
            return target
        time.sleep(0.05)
    raise RuntimeError("Cannot locate the owned panel before sampling")


def run(exe, lifecycle, expanded):
    active = subprocess.check_output(["tasklist", "/FI", "IMAGENAME eq yunqi-sidebar.exe", "/FO", "CSV"])
    if b"yunqi-sidebar.exe" in active.lower():
        raise RuntimeError("An existing YunQi session is active")
    data = Path(tempfile.mkdtemp(prefix="yunqi-normal-wv-"))
    env = {k: v for k, v in os.environ.items() if k.upper() not in {
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "WEBVIEW2_PIPE_FOR_SCRIPT_DEBUGGER",
        "WEBVIEW2_WAIT_FOR_SCRIPT_DEBUGGER", "WEBVIEW2_USER_DATA_FOLDER"}}
    env["WEBVIEW2_USER_DATA_FOLDER"] = str(data)
    start = time.perf_counter()
    proc = subprocess.Popen([str(exe)], cwd=exe.parent, env=env)
    samples = []
    lifecycle_result = None
    initial_cursor = cursor_pos() if expanded else None
    pointer = None
    try:
        if expanded:
            pointer = hover_panel(proc.pid, start + 7)
        for seconds in (8, 20):
            time.sleep(max(0, start + seconds - time.perf_counter()))
            if proc.poll() is not None:
                raise RuntimeError(f"Owned application exited ({proc.returncode})")
            elapsed = time.perf_counter() - start
            rows = tree.sample(proc.pid)
            top = windows({r["pid"] for r in rows})
            panels = [w for w in top if w["class"] == "Tauri Window"]
            if expanded and (len(panels) != 1 or panels[0]["size"][1] < 300):
                raise RuntimeError(f"Panel did not stay expanded at {seconds} seconds: {panels}")
            samples.append({"elapsedSeconds": round(elapsed, 3), "processes": rows,
                            "visibleWindows": top,
                            "webviewRoles": browser_roles(rows),
                            "privateWorkingSet": sum(r["privateWorkingSet"] for r in rows)})
        if lifecycle:
            lifecycle_result = check_single_instance(exe, env, proc)
    finally:
        if proc.poll() is None:
            panels = [w for w in windows({proc.pid}) if w["class"] == "Tauri Window"]
            if len(panels) == 1:
                win.PostMessageW(panels[0]["hwnd"], 0x0010, 0, 0)
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                proc.terminate()  # Popen holds the original host handle.
        proc.wait(timeout=10)
        if pointer is not None and cursor_pos() == pointer:
            if not win.SetCursorPos(*initial_cursor):
                raise C.WinError(C.get_last_error())
        for _ in range(8):
            try:
                shutil.rmtree(data)
                break
            except PermissionError:
                time.sleep(0.5)
    return samples, lifecycle_result


def with_expanded_window(pid, command):
    rows = tree.sample(pid)
    if rows[0]["name"].lower() != "yunqi-sidebar.exe":
        raise ValueError("Expected the owned YunQi desktop PID")
    original = cursor_pos()
    pointer = hover_panel(pid, time.perf_counter() + 15)
    try:
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            panels = [w for w in windows({pid}) if w["class"] == "Tauri Window"]
            if len(panels) == 1:
                panel = panels[0]
                rect = W.RECT()
                if not win.GetWindowRect(panel["hwnd"], C.byref(rect)):
                    raise C.WinError(C.get_last_error())
                offset = (rect.right - rect.left) // 2
                pointer = (rect.left + offset, rect.top + 2)
                if not win.SetCursorPos(*pointer):
                    raise C.WinError(C.get_last_error())
                # The child HWND can receive the first move before the page has
                # installed its pointer listener. Deliver the same native move
                # to the owned parent, whose dock handler checks GetCursorPos.
                if not win.PostMessageW(panel["hwnd"], 0x0200, 0, (2 << 16) | offset):
                    raise C.WinError(C.get_last_error())
                if panel["size"][1] >= 300:
                    break
            time.sleep(0.15)
        else:
            raise RuntimeError(f"Owned native panel did not expand: {panels}")
        print("Owned panel geometry:", panels[0]["size"], flush=True)
        return subprocess.run(command).returncode
    finally:
        if cursor_pos() == pointer and not win.SetCursorPos(*original):
            raise C.WinError(C.get_last_error())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path, help="Prior benchmark JSON containing both artifact hashes")
    parser.add_argument("output", type=Path)
    parser.add_argument("--expanded", action="store_true",
                        help="Hold the pointer over the panel, verify its height and restore the cursor")
    parser.add_argument("--rounds", type=int, default=3)
    parser.add_argument("--lifecycle", action="store_true",
                        help="Minimize and relaunch the last Rust session, then close it normally")
    options = parser.parse_args()
    if options.rounds < 1:
        parser.error("rounds must be positive")
    if options.output.exists():
        parser.error("choose an unused output path to preserve previous evidence")
    baseline = json.loads(options.baseline.read_text(encoding="utf-8-sig"))
    artifacts = baseline["executables"]
    result = {"utcStart": datetime.now(timezone.utc).isoformat(), "os": platform.platform(),
              "hoverExpanded": options.expanded, "artifacts": {}, "rounds": []}
    for name, item in artifacts.items():
        path = Path(item["path"])
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != item["sha256"]:
            raise RuntimeError(f"{name} SHA-256 differs from the previous benchmark")
        result["artifacts"][name] = {"path": str(path), "sha256": digest}
    for cycle in range(options.rounds):
        for name in (("old", "rust") if cycle % 2 == 0 else ("rust", "old")):
            samples, lifecycle_result = run(Path(artifacts[name]["path"]),
                                            options.lifecycle and name == "rust" and cycle == options.rounds - 1,
                                            options.expanded)
            if lifecycle_result is not None:
                result["lifecycle"] = lifecycle_result
            result["rounds"].append({"build": name, "cycle": cycle + 1, "samples": samples})
            options.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    result["medianPrivateWorkingSetBytes"] = {
        name: {str(t): statistics.median(r["samples"][i]["privateWorkingSet"] for r in result["rounds"]
                                         if r["build"] == name) for i, t in enumerate((8, 20))}
        for name in artifacts}
    options.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    if sys.argv[1:2] == ["--with-expanded-window"]:
        if len(sys.argv) < 4:
            raise SystemExit("Expected --with-expanded-window <owned PID> <test command> [arguments]")
        raise SystemExit(with_expanded_window(int(sys.argv[2]), sys.argv[3:]))
    main()
