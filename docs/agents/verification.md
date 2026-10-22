# 验证与交付

修改代码、测试、CI或证据时读取本页；具体命令以
[package.json](../../package.json)和[CI](../../.github/workflows/ci.yml)为准。

## 工作顺序

先读适用文档、核对领域规则与实际差异，说明计划，再编辑、验证和报告。
执行前记录HEAD、工作区及已有资料；用明确文件范围保留无关未提交/未跟踪工作。
用户要求先计划、只读、停止、不得push等边界优先。授权持久有效；已有授权足够时继续执行。

## 按变化选择检查

| 变化 | 入口 |
| --- | --- |
| 指引、复盘和索引 | pnpm test:project-guidance |
| 固定时间或前端展示 | pnpm test:time-governance |
| 规则/Domain/adapter | pnpm test:rule-consistency |
| Workbench依赖和能力边界 | pnpm test:workbench-governance |
| API/DTO/依赖/冻结投影 | pnpm contracts:check；pnpm test:contract-governance；pnpm schema:validate |
| 完整代码变更 | pnpm test；pnpm typecheck；pnpm test:coverage |
| 真实页面流程与视觉 | pnpm test:browser；详见下节 |

格式和导入/API等机械约束使用既有检查器。修复绕过时在原检查器加正反/变异用例，
保留局部遮蔽等合法写法；不能只追加文字规则或从测试中删掉难例。
测试和审查应从公开边界复现真实行为，不能只断言实现自己的常量或分类总数。
文档/索引变更不必无故重建完整业务；源文件哈希及相关检查需足以界定本轮结论。

## 浏览器与资源

使用[浏览器验收说明](../../tests/browser/README.md)和仓库runner，成功路径连接真实Service与adapter。
构建和浏览器启动按依赖串行，避免共享dist/依赖预打包在验收时被另一构建改写。
先完成构建；`pnpm exec playwright test`只适用于产物已经更新的情况。
本机资源受限可显式使用 `pnpm exec playwright test --workers=1`，报告并发与默认配置的差异。

服务、HTTP和WS均绑定本任务拥有的环境。Vite middleware的port:0、hmr:false及ws:false
不能凭名字推导监听行为，按锁定版本实际核对。当前runner将WS复用拥有的随机HTTP listener。
故障注入在目标状态ready后安装；查找控件前确认真实可见/可编辑状态。

遇资源错误或进程原生退出，先记录URL、控件状态、请求/Console、trace、主机资源与自有进程，
再用最小验证区分产品、测试环境、oracle和主机问题；未知根因保持未知。
先清理本任务已证明拥有的端口/进程，不能按node/chrome名称或同项目路径批量终止。
连续同类资源失败时停止增加压力；不能放宽断言、增加重试或合并不同轮结果制造全绿。

## 证据和报告

记录命令、退出码、输入、基线、dirty源哈希、构建/runner摘要、实际视口/浏览器、结果和清理。
HEAD只证明检出身份，不能单独证明旧dist来自该SHA。
截图证明已查看的状态；axe通过只证明已执行规则，不能宣称完整WCAG或临床验收。
同一轮总数、唯一样本数、循环断言数、故障注入、随机性质测试和专家案例分别说明。

保留初始RED、环境失败、方案失败、SKIP、NOT_RUN和最后结果。探针断言PASS、端口关闭、
进程自然退出是不同条件；聚合命令非零不能因子步骤通过改记为总体PASS。
Windows Redocly `UV_HANDLE_CLOSING`可在保留原失败后单独复查lint/check，不能抹去原非零退出。

提交前核对报告链接实际存在、关键证据未被.gitignore遗漏；旧Temp-only记录不能当作可移植仓库证据。
证据按新目录追加，原始Word、规格包、旧规则/冻结文件及历史记录保持原样。
只在有新变化、失败或未解决问题时扩大/重复验证。

## Git与远端

提交信息用feat/fix/refactor/test/docs等前缀及可选scope。按用户授权提交明确allowlist，
先核对差异和被忽略证据，再核对本地、tracking与实时远端身份。
PR审查和CI绑定最终head；历史PASS、旧merge或本地解析workflow不代表当前远端通过。
工作流保持固定名quality-gates与完整SHA锁定的Action。
清理先证明归属、合并和保存状态；登记删除、分支删除及目录删除分别报告。
若自动审批拒绝清理，说明被拒动作和理由并保留现场，不换工具/外壳绕过。
