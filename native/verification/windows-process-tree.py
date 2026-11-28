"""Sample an owned Windows desktop process tree using Tool Help and PSAPI EX2."""
from collections import defaultdict
from contextlib import ExitStack
import ctypes as C
from ctypes import wintypes as W
import json
import sys

kernel = C.WinDLL("kernel32", use_last_error=True)
size_t = C.c_size_t


class ProcessEntry(C.Structure):
    _fields_ = [
        ("dwSize", W.DWORD), ("cntUsage", W.DWORD), ("pid", W.DWORD),
        ("heap", size_t), ("module", W.DWORD), ("threads", W.DWORD),
        ("parent", W.DWORD), ("basePri", W.LONG), ("flags", W.DWORD),
        ("image", W.WCHAR * 260),
    ]


class MemoryCounters(C.Structure):
    # PROCESS_MEMORY_COUNTERS_EX2, psapi.h (Windows 10/11 22H2 + Sep 2023 update).
    _fields_ = [
        ("cb", W.DWORD), ("faults", W.DWORD), ("peakWorkingSet", size_t),
        ("workingSet", size_t), ("peakPagedPool", size_t), ("pagedPool", size_t),
        ("peakNonPagedPool", size_t), ("nonPagedPool", size_t),
        ("pagefile", size_t), ("peakPagefile", size_t), ("privateBytes", size_t),
        ("privateWorkingSet", size_t), ("sharedCommit", C.c_uint64),
    ]


def api(name, out, *args):
    fn = getattr(kernel, name)
    fn.restype = out
    fn.argtypes = args
    return fn


snapshot = api("CreateToolhelp32Snapshot", W.HANDLE, W.DWORD, W.DWORD)
first = api("Process32FirstW", W.BOOL, W.HANDLE, C.POINTER(ProcessEntry))
next_process = api("Process32NextW", W.BOOL, W.HANDLE, C.POINTER(ProcessEntry))
open_process = api("OpenProcess", W.HANDLE, W.DWORD, W.BOOL, W.DWORD)
memory = api("K32GetProcessMemoryInfo", W.BOOL, W.HANDLE, C.POINTER(MemoryCounters), W.DWORD)
close = api("CloseHandle", W.BOOL, W.HANDLE)


process_times = api("GetProcessTimes", W.BOOL, W.HANDLE, *([C.POINTER(W.FILETIME)] * 4))
system_time = api("GetSystemTimePreciseAsFileTime", None, C.POINTER(W.FILETIME))


def ticks(filetime):
    return filetime.dwHighDateTime << 32 | filetime.dwLowDateTime


def created_at(handle):
    creation, end, system, user = (W.FILETIME() for _ in range(4))
    if not process_times(handle, C.byref(creation), C.byref(end), C.byref(system), C.byref(user)):
        raise C.WinError(C.get_last_error())
    return ticks(creation)


def owned_nodes(root, rows, birth, cutoff):
    # Tool Help reports the historical parent PID. It can already have been reused.
    children = defaultdict(list)
    for pid, (parent, _) in rows.items():
        children[parent].append(pid)
    seen = set()
    todo = [(root, 0)]
    while todo:
        pid, earliest = todo.pop()
        if pid in seen:
            continue
        seen.add(pid)
        created = birth(pid)
        if created is None or created < earliest or created > cutoff:
            continue
        yield pid, created
        todo.extend((child, created) for child in children[pid])


def open_live(pid, rights):
    handle = open_process(rights | 0x1000, False, pid)  # include PROCESS_QUERY_LIMITED_INFORMATION
    if not handle:
        error = C.get_last_error()
        if error in (87, 1168):  # Process disappeared between snapshot and OpenProcess.
            return None
        raise C.WinError(error)
    return handle


def open_sampled(row, rights):
    """Return a new handle only if it still identifies the sampled process."""
    handle = open_live(row["pid"], rights)
    if handle:
        try:
            if created_at(handle) == row["creationTime100ns"]:
                return handle
        except BaseException:
            close(handle)
            raise
        close(handle)
    return None


def sample(root):
    snap_time = W.FILETIME()
    system_time(C.byref(snap_time))
    handle = snapshot(2, 0)  # TH32CS_SNAPPROCESS
    if handle == W.HANDLE(-1).value:
        raise C.WinError(C.get_last_error())
    rows = {}
    try:
        entry = ProcessEntry()
        entry.dwSize = C.sizeof(entry)
        ok = first(handle, C.byref(entry))
        while ok:
            rows[entry.pid] = (entry.parent, entry.image)
            ok = next_process(handle, C.byref(entry))
    finally:
        close(handle)
    if root not in rows:
        raise RuntimeError(f"Owned process {root} has exited")
    output = []
    with ExitStack() as cleanup:
        handles = {}

        def birth(pid):
            handle = open_live(pid, 0)
            if handle is None:
                return None
            cleanup.callback(close, handle)
            handles[pid] = handle
            return created_at(handle)

        for pid, created in owned_nodes(root, rows, birth, ticks(snap_time)):
            parent, name = rows[pid]
            mem = MemoryCounters()
            mem.cb = C.sizeof(mem)
            if not memory(handles[pid], C.byref(mem), mem.cb):
                raise C.WinError(C.get_last_error())
            output.append({"name": name, "pid": pid, "parent": parent, "creationTime100ns": created,
                           "pageFaults": mem.faults,
                           "workingSet": mem.workingSet, "privateWorkingSet": mem.privateWorkingSet,
                           "privateBytes": mem.privateBytes})
    if not output:
        raise RuntimeError(f"Owned process {root} disappeared during sampling")
    if not output[0]["privateWorkingSet"]:
        raise RuntimeError("This Windows build did not return the host private working set")
    return output


if __name__ == "__main__":
    print(json.dumps(sample(int(sys.argv[1]))))
