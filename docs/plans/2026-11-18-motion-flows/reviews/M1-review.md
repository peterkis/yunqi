# 评审记录：M1 动效与操作动线（评审人 Claude，2026-11-18）

| 分段 | 轮次 | 结论 | 要点 |
| --- | --- | --- | --- |
| M1-a | 2 | 通过 | tokens.json 新增 motion 组并与 tokens.css 手工同步（无 `build_css`，由 tokens.test.ts 校验一致）；`--craft-motion-*` 全部迁移。`MotionProvider` 首帧同步判定 `data-motion`：URL `?motion=off`、forced-colors、缺 `:has()` 为硬性 off；其余按 手动 > 系统 > 自动（能力、帧率探测）。动效设置为“自动 / 标准 / 精简 / 关闭”，放在当下页“更多”列表，“自动”用于回到自动判定。导航封装与 AsyncState 200/400ms 延迟就位。浏览器新增 reduced / off / 能力缺失三个 flows 项目。第 1 轮 13 项失败均为测试侧：axe 在淡入过程态扫描、焦点环断言误判默认 `all`、`?motion=off` 残留查询参数；返工 1 改为动画收敛后扫描、按属性与时长配对判定、仅允许注入的 motion 参数。 |

门禁：M1-a 返工 1 后 `test:browser` 381 PASS（6.6 分钟，flows 三档 + 能力缺失）。
