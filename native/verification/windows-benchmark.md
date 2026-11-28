# Windows 桌面进程树与交互延迟实测

## 2026-11-27 安装包对照（Release，Playwright 已连接 CDP）

同一台 Windows 11 Pro 10.0.26300、i7-1260P、16 逻辑核、WebView2 158。以下数据包含环回调试端口和 Playwright 连接的开销。该历史测量没有记录采样时的窗口尺寸；“首页空闲”表示页面已加载，贴顶或展开状态未留证。更新后的脚本会在两次内存采样时保存实际视口。普通启动结果见[后续审查](../../docs/rust-review-2026-11-27.md)。两个可执行文件均从离线 NSIS 安装包解出并直接运行，测试工具未安装或升级应用。每项耗时以毫秒、内存以 MiB（1,048,576 字节）表示。

| 指标 | Node 版 0.1.10 | Rust 版 0.2.0 |
| --- | ---: | ---: |
| 首页可查询耗时（3 次中位数） | 2,825.3 ms | 1,092.3 ms |
| 空闲进程数 / WebView2 / Node | 9 / 6 / 1 | 7 / 6 / 0 |
| 首页空闲，全树私有工作集 | 277.63 MiB | 200.31 MiB |
| 完成连续请求后，全树私有工作集 | 236.22 MiB | 188.42 MiB |
| 首页空闲，Node 私有工作集 | 75.73 MiB | 0 MiB |
| 首页空闲，全树私有提交量 | 383.38 MiB | 294.45 MiB |
| 年度查询（P50 / P95） | 5.0 / 6.7 ms | 3.6 / 4.3 ms |
| 指定时刻教学（P50 / P95） | 6.8 / 8.6 ms | 4.1 / 4.9 ms |
| 农历生日预览（P50 / P95） | 8.7 / 11.0 ms | 4.0 / 4.9 ms |
| 体质量表计分（P50 / P95） | 4.7 / 5.6 ms | 3.4 / 4.0 ms |

同一负载下首页空闲私有工作集下降 77.32 MiB（27.85%），连续请求后下降 47.80 MiB（20.24%）。旧版的 4,435 个 runtime 文件占 113,343,236 字节（108.09 MiB），新版包没有 runtime 目录。应用 EXE 由 29,842,944 增至 31,795,712 字节。每轮全系统 CPU 忙碌比例旧版为 21%–26%，新版为 17%–21%，此数含整机其他进程。这些是本机本次的观察值。

- 原始六轮数据在生成机器的 `.artifacts/native-verification/windows-desktop-benchmark.json`。每个版本有 360 笔计时请求，其中 4 项操作各 90 笔，另含未计时预热。
- 0.1.10 包内 EXE 的 SHA-256 为 `0be3c22bde4d4c88af38c7250633c37208141e96dfd63f8319daee1ff55d456a`。
- 0.2.0 包内 EXE 的 SHA-256 为 `75f0ff06de0fcadda8ea216c9d2d063f7672cb362d1d38f7aab64325a58b1b0b`。

## 复现方法

在同一 Windows 用户会话中以独立 WebView2 配置目录启动两个 Release 桌面程序。旧版传入包含原配 `runtime` 目录的便携应用，新版传入 Rust 便携应用。支持 Windows 11 22H2（2023-09 累积更新及以后）、Python 3 和带 `playwright-core` 的 Node 测试环境。基准程序只在启动的测试进程上启用环回调试端口，不向生产程序添加调试配置。若已有同名桌面实例，脚本会退出。

```powershell
node native/verification/windows-desktop-benchmark.cjs <旧版exe> <Rust版exe> <playwright-core目录> <新的结果JSON路径> 3
```

三对独立启动依次采用「旧、新」「新、旧」「旧、新」。每次启动都创建新的 WebView 用户目录。在工作台首页阶段列表渲染、且通过真实 Tauri `calculate` 命令成功取得 2026 年结果后，记录“可查询”时间。这个值包含创建进程、WebView 初始化、测试客户端连接、页面渲染和第一次调用。磁盘及系统文件缓存由操作系统管理。

等待 2 秒后采集空闲进程树。随后按年运气、指定时刻教学、农历生日预览、体质量表的顺序轮询。每类先预热一次，然后记录 30 次。每次间隔 80 毫秒，计时器位于 WebView 内，围绕完整 Tauri 调用及响应解析，涵盖旧版 Node 传输。所有调用逐一检查 HTTP 语义状态与成功信封。结束后再等待 2 秒，记录负载后的进程树。分位数采用最近秩法，90 次交互用于每版本每操作的 P50/P95，启动时间只有 3 次，宜查看各次值与中位数。

`windows-process-tree.py` 通过 Tool Help 的进程快照从启动 PID 递归获取子进程，通过 Win32 `K32GetProcessMemoryInfo` 和 `PROCESS_MEMORY_COUNTERS_EX2` 读取字节数。

| 结果字段 | 含义 |
| --- | --- |
| `privateWorkingSet` | 进程驻留的私有页。比较整个应用私有物理内存时采用此列。 |
| `workingSet` | 进程的工作集总量。多个进程同时映射的共享页可在求和时被重复计入。 |
| `privateBytes` | 已提交的私有虚拟内存，包含未驻留的部分。 |
| `host` / `webview` / `node` / `all` | 分别为启动的 Tauri 主进程、其 WebView2 子树中的 WebView2 进程、其 Node 子进程与全部进程。所有者树还可能有控制台宿主。 |

每个结果文件包含操作系统与 CPU、两个 EXE 的 SHA-256/版本/字节数、独立 `runtime` 的文件数与总字节数、各轮 PID 树、逐笔延迟及分组统计。测量中启用的 WebView2 调试和无用户数据的测试配置对两个版本采用相同设置。进程树求和的全工作集、单次预热与使用者任务管理器中的即时数字可能不同。

[Microsoft 对 Win32 内存字段的定义](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters_ex2)
