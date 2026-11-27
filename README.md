# 运气通 · TCM YunQi Lab

运气通是面向院内医生的五运六气学习与计算工具，可查看全年和当前阶段的运气、对照出生时令、阅读经典原文，以及完成体质量表。Windows x64 桌面版 **0.2.3** 可离线使用。规则、历法与评分已从 Node.js / Fastify 伴随进程迁入 **Tauri 2 主程序中的 Rust 引擎**。React 工作台继续使用同一份界面与版本化业务契约。

[Windows 安装与试用](desktop/README.md) · [0.2.3 安装包与校验值](docs/windows-0.2.3-fonts.md) · [新旧桌面实测](docs/windows-node-rust-comparison.md) · [项目协作指引](AGENTS.md)

## 运行方式与技术栈

| 使用场景 | 界面与调用路径 | 运行依赖 |
| --- | --- | --- |
| Windows 10/11 x64 离线侧栏 | React / TypeScript 工作台 → Tauri IPC → 进程内 `yunqi-core` → `tyme4rs` | Rust 发布程序和 WebView2。诊室电脑无需另装 Node.js、pnpm 或启动本地 API 服务 |
| 浏览器工作台 | 同一工作台 → HTTP → 独立 `yunqi-http` → 同一 `yunqi-core` | Rust HTTP 服务使用 Tokio / Hyper，默认监听 `127.0.0.1:3000`。网页构建产物可通过同源站点分发 |
| 契约维护与回归 | TypeScript `@yunqi/domain`、`@yunqi/calendar-adapter-tyme4ts`、Fastify `@yunqi/service` | 生成 OpenAPI、验证契约漂移，并为迁移提供固定版本的差分对照（提交 `7d6ce9b5`）。Playwright 网页回归也使用此参考服务 |

Rust 历法依赖固定为 `tyme4rs 1.5.1`，原实现使用同一作者的 `tyme4ts 1.5.2`。Tauri 宿主负责窗口、托盘、置顶、贴顶隐藏及院内更新客户端。业务 IPC 使用宿主进程内引擎，省去了旧桌面版的 Node.js sidecar。WebView2 自身仍按多进程模型运行。可选的院内更新分发服务独立部署。[Rust 核心](native/) · [HTTP 服务](native-http/) · [桌面宿主](desktop/src-tauri/) · [院内更新说明](desktop/updates.md)

## Windows 安装与构建

首次离线安装或需要补装 WebView2 时，使用完整包 `运气通_0.2.3_x64-setup.exe`（303.57 MiB）。终端已有 WebView2 145 或更高版本时，可使用 `运气通_0.2.3_x64-upgrade.exe`（22.95 MiB）。两个交付包包含相同的桌面程序，完整包另含微软 WebView2 x64 离线安装器。程序按当前 Windows 用户安装，安装后从开始菜单启动“运气通”。[本版发布记录与 SHA-256](docs/windows-0.2.3-fonts.md)

从源码构建完整离线包，需要 Windows x64、MSVC C++ 工具链、Windows SDK、Rust、Node.js、pnpm 10.32.1 和 PowerShell 7。在仓库根目录运行：

```powershell
./desktop/build.ps1
```

产物位于 `desktop/src-tauri/target/release/bundle/nsis/`。构建升级包时使用 `./desktop/build.ps1 -UpgradeOnly`。两种模式共用默认输出目录和 NSIS 文件名，连续构建时应先保存第一份产物，再按包型命名并计算校验值。首轮构建需获取依赖，已有经核验的微软离线安装器时可向脚本提供文件路径及 SHA-256。[构建参数与桌面验收](desktop/README.md#构建与验证)

## 迁移带来的变化

**当前发布包对照。** 在同一台 Windows 电脑上，以 400×1020 展开窗口运行原 Node/Fastify 桌面版 0.1.10 和当前 Rust 版 0.2.3。两版均使用普通 Release，各启动 3 次、交替测量，未连接 DevTools 或 CDP。展开 40 秒后，全进程树私有工作集中位数从 **193.91 MiB 降至 118.94 MiB**，减少 **74.97 MiB（38.66%）**。这项比较包含移除 sidecar、WebView2 管理与字体加载等历次变化。旧版有一轮在 40 秒快照中未观察到 Node 子进程，该观测值保留在中位数中。旧桌面程序来自独立的 0.1.10 桌面工作树，业务差分则使用原仓库固定提交。逐轮数据及限制见[新旧桌面实测](docs/windows-node-rust-comparison.md)。

**初次移植对照。** 0.1.10 与首次 Rust 移植版 0.2.0 曾在同一台 Windows 11 / WebView2 158 电脑上交替测试，每版启动 3 次。以下数值来自此次独立实验，首页就绪要求已渲染且实际年度查询成功返回。

| 同机实测指标 | Node/Fastify 0.1.10 | Rust 0.2.0 |
| --- | ---: | ---: |
| 首页空闲私有工作集 | 277.63 MiB | 200.31 MiB |
| 连续查询后私有工作集 | 236.22 MiB | 188.42 MiB |
| 首次可查询，中位数 | 2.825 秒 | 1.092 秒 |
| 进程树数量（含 WebView2） | 9 | 7 |

首页空闲时，旧版 Node 进程占 75.73 MiB；两版 WebView2 进程各为 6 个。Windows 与 Linux 的迁移差分在各平台分别回放 13,985 对请求，状态、完整 JSON 与指定缓存头零差异，覆盖全部 10 项业务操作。节气、闰月、交界日前后毫秒、非法输入及九质评分的范围和可复现方法见[迁移验证报告](docs/rust-migration.md)。

**0.2.3 的字体收益另行测量。** 三个主要页面在实际 WebView2 中各读取 708,960 字节的常用字体，遇到范围外的字才加载完整离线字库。普通 Release 展开 40 秒后，0.2.2 与 0.2.3 的全进程私有工作集分别为 160.10 和 116.00 MiB。这次用同等大小的展开窗口、每版各启动一次，两轮后台 CPU 负载不同。与上表的三轮迁移基准采用不同采样时点，应分别解读。[0.2.3 实测、测试结果与已知超时](docs/windows-0.2.3-fonts.md) · [0.2.2 贴顶内存与唤醒](docs/webview-memory-2026-11-27.md) · [0.2.1 审查记录](docs/rust-review-2026-11-27.md)

## 当前工作台能力

- **当下运气**显示年度中运、司天、在泉，以及当前的运与气。主客关系随结果展示，其余阶段、原文、释义与出处可按需展开。年度页和指定时点页可单独查询。
- **先天对照**支持年龄、公历出生年、公历或农历生日、闰月及出生时刻。时刻不详时保留交界候选。可在已提交的对照中发起一份体质测评，同时查看先天与当下背景。
- **体质量表**按 GB/T 46939-2025 提供一题一屏的 26 题作答流程，支持键盘录入，显示九质评分、倾向与兼夹。结束测评、清空已提交的关联资料或提交新对照会销毁原关联答卷。
- **门诊侧栏**采用 400px 面板、浅深主题和可收起的胶囊。Windows 宿主支持拖动、贴顶、置顶和托盘。设计规范涵盖五档字号、常用黑体与宋体及完整离线字库回退。[设计规范与原型](docs/design/README.md)

出生资料和答卷限当前会话，不建立患者身份关联。问诊入口仍是规划页。产品用于理论学习、只读展示及规则解释，不提供自动诊断、辨证、处方或治疗决策。[医疗与阶段范围](docs/agents/clinical-scope.md) · [首轮医生反馈](docs/plans/2026-11-16-clinician-feedback.md) · [第二轮反馈](docs/plans/2026-11-16-clinician-feedback-continuation.md)

## 规则、时间与公共契约

业务时间固定为北京时间 UTC+08。按精确交节时刻支持 **1900–2100 运气年**，即 1900 年大寒当刻至 2101 年大寒前。界面直接显示接口的 `localTime`。五步运沿用已标识的节气偏移教学口径。规则的正式专家冻结状态以[冻结说明](rules/RULE_FREEZE_NOTE.md)为准，工程差分和契约冻结只验证所选实现基线。

| 范围 | 版本与规范 |
| --- | --- |
| 核心运气与教学规则 | [YQ-MVP-RULES-1.1.0](rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md) · [YQ-LEARNING-RULES-1.3.0](rules/LEARNING_RULES_V1_3.md) |
| 体质与经典阅读 | [YQ-CONSTITUTION-1.0.0](rules/CONSTITUTION-GBT46939-2025.md) · [YQ-CLASSICAL-READING-1.1.0](rules/CLASSICAL_READING_V1_1.md) |
| 业务 API | [YQ-API-CONTRACT-1.4.0](docs/contracts/YQ-API-CONTRACT-1.4.0.md)，OpenAPI 文档 1.6.0 / 规范 3.1.0 |
| TypeScript 工程包 | Domain 1.4.0、Service 2.4.0、Contracts / Client 1.4.0 |

十项公开业务 API 保留原路径、请求与响应结构。学习与量表的七个端点使用 `Cache-Control: no-store`。桌面和浏览器工作台均由 `@yunqi/client` 使用公开 DTO 搭配相应传输方式，展示组件不自行拼装 API、重算历法或定义 DTO。[契约与请求格式](packages/yunqi-service/README.md) · [客户端边界](docs/agents/api-contracts.md) · [工作台约束](docs/agents/workbench.md)

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/v1/yunqi/year/{year}` | 年度运气 |
| GET | `/api/v1/yunqi/current` | 当前核心运气 |
| POST | `/api/v1/yunqi/calculate` | 指定时点的核心运气 |
| GET | `/api/v1/yunqi/learning/current` | 当前阶段、关系与经典原文 |
| POST | `/api/v1/yunqi/learning/calculate` | 指定时点的教学分析 |
| POST | `/api/v1/yunqi/learning/birth-year-comparison` | 公历出生年的年度候选 |
| POST | `/api/v1/yunqi/learning/birth-date-preview` | 公历或农历生日解析与交界预览 |
| POST | `/api/v1/yunqi/learning/birth-comparison` | 出生时段候选与当下快照 |
| GET | `/api/v1/constitution/questionnaire` | 问卷及计分题定义 |
| POST | `/api/v1/constitution/assess` | 完整答卷的九质评分 |

## 浏览器开发与部署

开发机准备 Rust / Cargo、Node.js 22.12+ 与 pnpm 10.32.1，在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build
```

在两个终端分别启动 Rust 服务和 Vite 工作台：

```sh
# 终端一
pnpm start:native
```

```sh
# 终端二
pnpm --filter @yunqi/workbench dev
```

打开 Vite 输出的本地地址。保留 `VITE_YUNQI_API_BASE_URL` 为空，Vite 会将同源业务请求代理至 `http://127.0.0.1:3000`。若用 `PORT` 更改 Rust 监听端口，将相同地址设在 `apps/yunqi-workbench/.env.local` 的 `YUNQI_DEV_API_TARGET`，然后重启 Vite。生产部署为静态工作台配置同源 API 反向代理；如使用独立 API 域名，由部署层配置跨域与预检。单独部署 Rust 服务可用 `cargo build --release --locked --manifest-path native-http/Cargo.toml` 编译 `yunqi-http`。需要复核旧版行为时，先停止占用同一端口的服务，再运行 `pnpm --filter @yunqi/service start` 启动 Fastify 参考实现。

## 验证与协作

| 检查范围 | 仓库根目录命令 |
| --- | --- |
| Rust 核心、冻结 schema、时区与 HTTP 模块 | `pnpm test:native` |
| 对照固定提交的 Fastify 响应与历法 | `pnpm verify:native --exhaustive` |
| 独立 Rust HTTP 真实回环对照 | `pnpm verify:native-http` |
| Windows 原生窗口和更新逻辑 | `cargo test --release --locked --manifest-path desktop/src-tauri/Cargo.toml`（先构建工作台） |
| 公共契约、规则一致性、时间治理 | `pnpm contracts:check`、`pnpm test:rule-consistency`、`pnpm test:time-governance` |
| 工程测试、类型、覆盖率、协议校验 | `pnpm test`、`pnpm typecheck`、`pnpm test:coverage`、`pnpm schema:validate` |
| 网页流程、截图、布局与无障碍 | 首次执行 `pnpm exec playwright install chromium`，然后 `pnpm test:browser` |

网页矩阵通过 Vite 和真实 Fastify 参考服务验证工作台。桌面程序的业务 IPC、WebView2 与原生窗口使用独立的[桌面验收流程](desktop/README.md#构建与验证)。0.2.3 工作台 779 项单测通过，网页矩阵首轮 504 通过、8 失败、7 跳过，其中 6 项在相同阈值下独跑通过，另有两项性能用例在前一基线中也失败。各版本的结果与复测条件记录在[发布记录](docs/windows-0.2.3-fonts.md)。

工程约定见[分类指引](docs/agents/README.md)与[会话复盘索引](docs/retrospectives/README.md)。测试细节见[浏览器验收说明](tests/browser/README.md)、[验证与交付](docs/agents/verification.md)及 [CI 工作流](.github/workflows/ci.yml)。
