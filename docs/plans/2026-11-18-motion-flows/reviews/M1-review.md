# 评审记录：M1 动效与操作动线（评审人 Claude，2026-11-18）

| 分段 | 轮次 | 结论 | 要点 |
| --- | --- | --- | --- |
| M1-a | 2 | 通过 | tokens.json 新增 motion 组并与 tokens.css 手工同步（无 `build_css`，由 tokens.test.ts 校验一致）；`--craft-motion-*` 全部迁移。`MotionProvider` 首帧同步判定 `data-motion`：URL `?motion=off`、forced-colors、缺 `:has()` 为硬性 off；其余按 手动 > 系统 > 自动（能力、帧率探测）。动效设置为“自动 / 标准 / 精简 / 关闭”，放在当下页“更多”列表，“自动”用于回到自动判定。导航封装与 AsyncState 200/400ms 延迟就位。浏览器新增 reduced / off / 能力缺失三个 flows 项目。第 1 轮 13 项失败均为测试侧：axe 在淡入过程态扫描、焦点环断言误判默认 `all`、`?motion=off` 残留查询参数；返工 1 改为动画收敛后扫描、按属性与时长配对判定、仅允许注入的 motion 参数。 |
| M1-b | 2 | 通过 | 分段指示块由 `useSegmentIndicator` 统一测量（首帧与 ResizeObserver 直接到位，仅 full 档滑动）。`PanelNavigation` 在路由导航器上统一包视图过渡：平级按 tab 顺序定方向，下钻/返回反向，只有内容区与页头标题参与；下钻返回按内存 Map 恢复 scrollTop 与入口焦点。主题切换以 `data-theme-switching` 同帧变色，full 档整屏交叉淡化。按下反馈仅非文字按钮缩放。风险记录：导航拦截依赖 React Router 导出的 `UNSAFE_NavigationContext`，当前版本锁定 7.18.1，升级路由需复核。第 1 轮 1 项失败为测试竞态（full 档导航在视图过渡回调中晚一帧提交，测试点击后立即 reload）；返工 1 在下钻后等待 URL 与标题，并排查同类竞态、补单测确认跳过或抛错时仍单次提交。 |
| M1-c | 3 | 通过 | `ANSWER_HOLD_MS = 240`（可改选重计时，`keepFocus` 保留）；翻题方向过渡、九维进度条与 ✓、← / Backspace 上一题（输入框内不响应）；结果揭示（判定卡 → 条形 → 互参卡）；销毁淡出、“答卷已销毁”3 秒提示与两种入口回焦。先天对照与量表改为 `RetainedSession` 常驻挂载，跨 tab 保留会话（仅内存，隐藏时 `hidden`+`inert`，暂停刷新与定时器）。**偏离**：卡片时序 80 + 8×24 + 240 = 512ms 超出 400ms 上限，新增 `motion-result-start` 80ms 与 `motion-result-stagger` 10ms（80 + 8×10 + 240 = 400），圆点仍用 24ms，待用户确认。第 1 轮 8 项失败：延迟浮点比较、翻题/销毁副本重复 live region（产品缺陷，离场副本改 `aria-hidden`+`inert`）、精简档残留 180ms 箭头过渡（产品缺陷）、常驻会话使 textContent 比较失效；第 2 轮 1 项：结果揭示过程态测几何；返工 2 统一先收敛再测。第 3 轮 419/421，2 项为开发服务器 502 / ERR_ADDRESS_INVALID，单独重跑 14/14 与 4/4×2 通过，记为环境抖动。 |

门禁：M1-a 返工 1 后 `test:browser` 381 PASS（6.6 分钟，flows 三档 + 能力缺失）。 M1-b 返工 1 后 `test:browser` 397 PASS。 M1-c 返工 2 后 `test:browser` 419/421（2 项环境抖动，单独重跑通过）。
