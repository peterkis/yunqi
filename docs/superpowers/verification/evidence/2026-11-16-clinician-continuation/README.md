# 第二轮验收证据索引

功能提交：`9f27c178dad3e6d16685608917dc4022b14d0e3f`；前轮基线：`d31e038f4b6c5650288063cf44d52d267a01494a`。
结论与限制见[验收报告](../../2026-11-16-clinician-feedback-continuation.md)。此目录不替换前轮或历史证据。

| 文件组 | 作用 |
| --- | --- |
| `baseline.json` | 本轮起点，旧CI仅作基线 |
| `domain-classical-red.txt`、`domain-classical-focused-green.txt`、`domain-all-green.txt`、`domain-*typecheck.txt` | 经典内容初始失败与局部最终结果 |
| `frontend-session-*.txt`、`frontend-*typecheck*.txt` | 新增会话测试初始失败、快速重算缺陷、修复与测试类型检查过程 |
| `linux-gates.json`、`linux-*.txt`、`run-gates.py` | 完整测试／类型／覆盖率／契约／Schema门禁及运行前源码、构建摘要 |
| `linux-candidate-binding.json`、`linux-adapter-build.json` | 测试工作树与提交的绑定；补充嵌套adapter构建文件 |
| `staging-diff-check-*.txt`、`trailing-newline-fix.json` | 两个新增文件的EOF检查失败及纯末尾LF修正 |
| `raw-evidence-whitespace.json` | 最终归档保留原始日志空白与PowerShell CRLF的全量检查非零结果；作者内容另行检查，不清洗原证据 |
| `standards-review*.json`、`spec-review*.json`、`spec-review*.md`、`candidate-review-binding.json` | 两轴独立审查、源码哈希及EOF跟进；原报告保留 |
| `delivery-prose-review.json` | 交付计数与范围核对；遗漏的预览脚本路径已补入对应记录 |
| `windows-9f27c178dad3-*.txt`、`windows-9f27c178dad3-state.json`、`windows-run.cjs` | Windows重新构建、5流程及8布局运行、源码／构建与原件状态 |
| `windows-flows-summary.json`、`windows-visual-summary.json` | 两次定向浏览器实际结果，不是Windows全套118项 |
| `original-files-baseline.json` | Windows原31个文件的本轮初始hash；最终hash在state文件中 |
| `ci-45-run.json`、`ci-45-quality-gates.txt` | GitHub精确head的run/artifact身份和原始job日志 |
| `ci-45-browser-summary.json`、`ci-45-browser-environment.json` | 118项结果索引、浏览器版本、100次axe扫描与环境清理；不复制大体积内联axe或git元数据 |
| `browser-inventory.txt` | 测试发现清单，仅证明118项被发现，不单独证明执行通过 |
| `manual-preview.json`、`screenshots/manual-current-reading.png` | 实时预览查看、扩展日期操作未完成与截图限制，不混同自动化结果 |
| `screenshots/birth-*.png` | 从已校验CI45原始artifact直接提取的截图，未改图；来源路径和SHA256在browser-summary中 |
| `manifest.sha256` | 本目录文件字节摘要，不包含自身 |

完整CI45 artifact ZIP为69,740,730字节，SHA256为`23d6314c5af8e6b863719e15ceba6cfbcefb6fe554f5910ee717480c9c8d5fa7`，托管到期2026-11-30；本目录保留可移植的主要日志、结果和所选原始截图。

自动化截图使用合成出生日期1990-05-12、固定当前时点2024-01-20 22:07:22（UTC+08）；实时预览截图来自2026-11-16。100次axe扫描与118项浏览器用例均为工程运行次数，不是专家样本或临床病例。
