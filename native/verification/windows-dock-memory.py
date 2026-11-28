"""Measure one packaged Windows desktop build during a reproducible dock cycle.

Run on Windows 11 with Python 3.10+ and leave the pointer idle during the run.
The default cycle measures at 20 s expanded, 15/40/75 s folded, then 2/20 s
after waking. Use --short for 20/40 s in a floating panel without moving the
pointer or changing its preferences, or --minimize for a real
minimize and restore. Run each comparison with interleaved, independent launches.
JSON counters are bytes. HWND resize latency measures native geometry only.
"""
import argparse
from contextlib import contextmanager, ExitStack
import ctypes
from ctypes import wintypes
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time


spec = importlib.util.spec_from_file_location(
    "normal_start", Path(__file__).with_name("windows-normal-start.py")
)
normal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(normal)
tree, win = normal.tree, normal.win
win.GetSystemMetrics.argtypes = (ctypes.c_int,)
METRICS = ("workingSet", "privateWorkingSet", "privateBytes")


def save(output, result):
    with tempfile.NamedTemporaryFile(mode="w", dir=output.parent, suffix=".tmp",
                                     encoding="utf-8", delete=False) as temporary:
        tmp = Path(temporary.name)
        try:
            json.dump(result, temporary, ensure_ascii=False, indent=2)
        except BaseException:
            temporary.close()
            tmp.unlink(missing_ok=True)
            raise
    try:
        tmp.replace(output)
    finally:
        tmp.unlink(missing_ok=True)


def window_rect(hwnd):
    rect = wintypes.RECT()
    if not win.GetWindowRect(hwnd, ctypes.byref(rect)):
        raise ctypes.WinError(ctypes.get_last_error())
    return rect


def window_size(hwnd):
    rect = window_rect(hwnd)
    return [rect.right - rect.left, rect.bottom - rect.top]


def wait_until(target):
    time.sleep(max(0, target - time.perf_counter()))


def owned_panel(process):
    deadline = time.perf_counter() + 15
    while time.perf_counter() < deadline and process.poll() is None:
        windows = [w for w in normal.windows({process.pid}) if w["class"] == "Tauri Window"]
        if len(windows) == 1 and windows[0]["childClasses"].get("WRY_WEBVIEW") == 1:
            return windows[0]["hwnd"]
        time.sleep(0.05)
    raise RuntimeError("Could not locate exactly one owned panel with one WebView")


class Pointer:
    def __init__(self):
        self.original = normal.cursor_pos()
        self.last = self.original

    def require_idle(self):
        if normal.cursor_pos() != self.last:
            raise RuntimeError("Pointer moved independently. Discard this run.")

    def change_dock_state(self, hwnd, expand):
        self.require_idle()
        rect = window_rect(hwnd)
        center = (rect.right - rect.left) // 2
        if expand:
            point = (rect.left + center, rect.top + 2)
        else:
            left = win.GetSystemMetrics(76)  # SM_XVIRTUALSCREEN
            right = left + win.GetSystemMetrics(78)
            x = rect.left - 50 if rect.left - 50 >= left else min(rect.right + 50, right - 1)
            point = (x, rect.top + 20)
        start = time.perf_counter()
        if not win.SetCursorPos(*point):
            raise ctypes.WinError(ctypes.get_last_error())
        self.last = point
        # The WRY child can receive the first pointer message. Notify our own
        # parent as well. Its dock handler verifies the actual cursor position.
        message, pos = (0x0200, (2 << 16) | center) if expand else (0x02A3, 0)
        if not win.PostMessageW(hwnd, message, 0, pos):
            raise ctypes.WinError(ctypes.get_last_error())
        while time.perf_counter() - start < 12:
            self.require_idle()
            size = window_size(hwnd)
            reached_target = size[1] >= 300 if expand else 0 < size[1] < 20
            if reached_target:
                return {"ms": (time.perf_counter() - start) * 1000, "size": size}
            time.sleep(0.004)
        raise RuntimeError(f"Unexpected panel size {window_size(hwnd)} after pointer transition")

    def restore(self):
        if normal.cursor_pos() == self.last and not win.SetCursorPos(*self.original):
            raise ctypes.WinError(ctypes.get_last_error())
        return normal.cursor_pos() == self.original


@contextmanager
def window_preferences(receipt, stationary):
    # The app uses a Windows known folder, so overriding APPDATA does not isolate
    # this file. Preserve existing settings byte-for-byte, including absence.
    prefs = Path(os.environ["APPDATA"]) / "cn.yunqi.offlinepilot" / "window.json"
    original = prefs.read_bytes() if prefs.exists() else None
    receipt["existed"] = original is not None
    seed = b'{"docked":true}'
    created = False
    new_parent = not prefs.parent.exists()
    if stationary:
        if original and json.loads(original.decode("utf-8-sig")).get("docked"):
            raise RuntimeError("Use a floating panel for pointer-free expanded measurements")
    elif original is None:
        prefs.parent.mkdir(parents=True, exist_ok=True)
        with prefs.open("xb") as stream:
            stream.write(seed)
        created = True
    elif not json.loads(original.decode("utf-8-sig")).get("docked"):
        raise RuntimeError("Dock the panel before testing. Existing settings were preserved.")
    try:
        yield
    finally:
        if created:
            if prefs.read_bytes() != seed:
                raise RuntimeError("The temporary preference changed during the run")
            prefs.unlink()
            if new_parent and not any(prefs.parent.iterdir()):
                prefs.parent.rmdir()
        after = prefs.read_bytes() if prefs.exists() else None
        receipt["restored"] = after == original
        if after != original:
            raise RuntimeError("Window preferences changed during the test")


def snapshot(pid, hwnd, phase, start, roles):
    rows = tree.sample(pid)
    identities = {(r["pid"], r["creationTime100ns"]) for r in rows
                  if r["name"].lower() == "msedgewebview2.exe"}
    if not identities:
        raise RuntimeError("WebView2 process tree is missing")
    if identities != roles.keys():
        by_pid = {r["pid"]: r for r in normal.browser_roles(rows)}
        roles.clear()
        for identity in identities:
            role = by_pid[identity[0]]
            if role["debugSwitches"]:
                raise RuntimeError("Found debugger switches during ordinary launch")
            roles[identity] = role["subtype"] or role["role"]
    groups = {}
    for row in rows:
        fallback = "host" if row["pid"] == pid else row["name"]
        name = roles.get((row["pid"], row["creationTime100ns"]), fallback)
        row["role"] = name
        group = groups.setdefault(name, dict.fromkeys(METRICS, 0))
        for key in METRICS:
            group[key] += row[key]
    return {"phase": phase, "elapsed": round(time.perf_counter() - start, 3),
            "size": window_size(hwnd), "iconic": bool(win.IsIconic(hwnd)),
            "total": {key: sum(row[key] for row in rows) for key in METRICS},
            "roles": groups, "processes": rows}


def change_minimized(hwnd, minimized):
    win.ShowWindowAsync(hwnd, 6 if minimized else 9)  # SW_MINIMIZE / SW_RESTORE
    deadline = time.perf_counter() + 5
    while time.perf_counter() < deadline:
        if bool(win.IsIconic(hwnd)) == minimized:
            return
        time.sleep(0.005)
    raise RuntimeError("Window did not complete the native minimize/restore transition")


def normal_close(process, hwnd):
    with ExitStack() as cleanup:
        handles = {}
        for row in tree.sample(process.pid):
            handle = tree.open_sampled(row, 0x00100000)  # SYNCHRONIZE
            if handle:
                cleanup.callback(tree.close, handle)
                handles[row["pid"]] = handle
        if not win.PostMessageW(hwnd, 0x0010, 0, 0):  # WM_CLOSE
            raise ctypes.WinError(ctypes.get_last_error())
        process.wait(timeout=12)
        deadline = time.perf_counter() + 12
        for pid, handle in handles.items():
            timeout = max(0, int(1000 * (deadline - time.perf_counter())))
            if normal.wait_for_exit(handle, timeout) != 0:
                raise RuntimeError(f"Owned process {pid} is still running after normal close")
        return len(handles)


def run(args):
    exe = args.exe.resolve(strict=True)
    existing = subprocess.check_output(["tasklist", "/FI", "IMAGENAME eq yunqi-sidebar.exe", "/FO", "CSV"])
    if b"yunqi-sidebar.exe" in existing.lower():
        raise RuntimeError("Existing YunQi session detected")
    with exe.open("rb") as binary:
        digest = hashlib.sha256()
        for data in iter(lambda: binary.read(1024 * 1024), b""):
            digest.update(data)
    if args.sha and digest.hexdigest() != args.sha.lower():
        raise ValueError("Executable does not match the supplied SHA-256")
    output = args.output.resolve()
    output.touch(exist_ok=False)
    pointer = None if args.short else Pointer()
    result = {"utc": datetime.now(timezone.utc).isoformat(), "exe": str(exe), "sha256": digest.hexdigest(),
              "label": args.label, "cycle": args.cycle, "samples": [], "transitions": {},
              "preferences": {}, "completed": False}
    try:
        with window_preferences(result["preferences"], args.short), tempfile.TemporaryDirectory(prefix="yunqi-dock-") as profile:
            env = {k: v for k, v in os.environ.items() if not k.upper().startswith("WEBVIEW2_")}
            env["WEBVIEW2_USER_DATA_FOLDER"] = profile
            start = time.perf_counter()
            process = subprocess.Popen([str(exe)], cwd=exe.parent, env=env)
            hwnd = None
            try:
                hwnd = owned_panel(process)
                transitions = result["transitions"]
                roles = {}

                def take_at(t, phase, expected):
                    wait_until(t)
                    if pointer:
                        pointer.require_idle()
                    snap = snapshot(process.pid, hwnd, phase, start, roles)
                    height = snap["size"][1]
                    if snap["iconic"]:
                        observed = "minimized"
                    elif 0 < height < 20:
                        observed = "folded"
                    elif height >= 300:
                        observed = "expanded"
                    else:
                        observed = "intermediate"
                    if observed != expected:
                        raise RuntimeError(f"{phase} expected {expected}, found {observed} at {snap['size']}")
                    result["samples"].append(snap)
                    save(output, result)
                    print(phase, snap["size"], round(snap["total"]["privateWorkingSet"] / (1024 ** 2), 2), flush=True)

                if pointer:
                    transitions["initialExpand"] = pointer.change_dock_state(hwnd, True)
                take_at(start + 20, "expanded20", "expanded")
                if args.short:
                    take_at(start + 40, "expanded40", "expanded")
                else:
                    if args.minimize:
                        change_minimized(hwnd, True)
                    else:
                        transitions["fold"] = pointer.change_dock_state(hwnd, False)
                    inactive = time.perf_counter()
                    state = "minimized" if args.minimize else "folded"
                    for seconds in (15, 40, 75):
                        take_at(inactive + seconds, f"{state}{seconds}", state)
                    wake_start = time.perf_counter()
                    if args.minimize:
                        change_minimized(hwnd, False)
                    transitions["wake"] = pointer.change_dock_state(hwnd, True)
                    awake = time.perf_counter()
                    if args.minimize:
                        transitions["restoreToGeometryMs"] = (awake - wake_start) * 1000
                    for seconds in (2, 20):
                        take_at(awake + seconds, f"wake{seconds}", "expanded")
                result["exitedProcessHandles"] = normal_close(process, hwnd)
            finally:
                if process.poll() is None:
                    if hwnd:
                        win.PostMessageW(hwnd, 0x0010, 0, 0)
                    try:
                        process.wait(timeout=8)
                    except subprocess.TimeoutExpired:
                        process.terminate()  # original host handle from Popen
                        process.wait(timeout=10)
        result["completed"] = True
    finally:
        result["pointerMode"] = "stationary" if args.short else "dock transitions"
        result["cursorRestored"] = pointer.restore() if pointer else None
        save(output, result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("exe", type=Path, help="Executable of the packaged Rust desktop app")
    parser.add_argument("output", type=Path, help="New JSON file in an existing directory")
    parser.add_argument("--label", default="release")
    parser.add_argument("--cycle", type=int, default=1)
    parser.add_argument("--sha", help="Expected SHA-256 for this exact executable")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--short", action="store_true", help="Sample while expanded at 20 and 40 seconds")
    mode.add_argument("--minimize", action="store_true", help="Use native minimize/restore instead of folding")
    run(parser.parse_args())
