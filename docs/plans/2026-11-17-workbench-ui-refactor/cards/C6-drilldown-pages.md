# C6 下钻页：年度分析、指定时点、问诊规划、未找到与反馈状态

## 目标

把原型未覆盖但保留的页面按新设计语言重绘为面板内下钻页。

## 必读

- `1-layout.md`、`2-constraints.md`；组件 InfoCard、Button、RelationChip、ElementDot
- `src/features/yunqi/year-analysis/**`、`time-analysis/**`、`src/features/inquiry/**`、`src/app/NotFoundPage.tsx`、`src/components/feedback/**`
- `docs/agents/workbench.md`（年度与指定时点语义）、`docs/agents/clinical-scope.md`（问诊入口边界）

## 要求

1. **年度分析**（`/yunqi/year`、`/yunqi/year/:year`）：下钻标题“年度详情”；年份选择（URL 唯一所有者，1900–2100，前后年按钮有界）；年度摘要卡复用 C3 全年卡样式；六步以单列可选列表 + 选中详情呈现，中性语义（不标“当前/已过”），每步保留两端规范时间；400px 内不换行溢出。
2. **指定时点**（`/yunqi/calculate`）：下钻标题“指定时点”；北京时间输入（保持现有字符串规范化与原生控件行为）；提交后结果：所选阶段详情在前、年度摘要在后；脏结果立即隐藏；固定脱敏错误提示。
3. **问诊规划**（`/yunqi/inquiry`）：下钻页，仅只读规划说明，零业务请求，标注“规划中”；不出现在分段导航，可从页脚或“更多”文字链接进入（由你选一处，报告说明）。
4. **未找到页、加载、空、错误、重试状态**：统一为面板内卡片样式，文案中性、无红色、无警示图标。
5. 保持全部现有行为与治理约束（年份 URL 所有权、零查询入口、提交后才查询、阶段语义不串用）。
6. 改写相关单测与 `workbench.flows`、`ux-walkthrough`、visual 用例。

## 验收标准

- 以上页面在 400 × 860 下可用、无横向滚动，键盘可达；行为与改写前一致（由测试证明）。
- 测试全绿。

## 检查

同 C2。
