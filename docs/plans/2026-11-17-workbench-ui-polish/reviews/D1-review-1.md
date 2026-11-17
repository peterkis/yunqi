# D1 评审 1（Claude）

结论：返工。实现方向正确（compact 时间、精确时刻集中到“计算说明与版本”、摘要条、单候选 meta 来自 API `ambiguous`、新增两个工作站项目），单测与门禁绿；
评审方运行 `pnpm test:browser`：192 通过、3 失败，均为未随本卡改写的浏览器用例。

## 失败与要求

1. `ux-walkthrough.flows.spec.mjs:45`「panel stage selection … preserves exact times」：仍断言阶段单选的可访问描述含完整 `2024-…+08:00`。
   现描述为 compact + “精确边界见计算说明与版本”。改写：断言描述为 compact 格式且含该提示；展开“计算说明与版本”后，断言三之气精确起止可见，且对应 `<time dateTime>` 等于 API `localTime`（不放宽“保留精确时刻”的意图）。
2. `ux-walkthrough.flows.spec.mjs:79`「keyboard recovery」与 `workbench.flows.spec.mjs:224`「supported annual boundary years」：仍查找可见的“追溯信息”区域。
   该信息已移入折叠的“计算说明与版本”。改写：先展开（键盘方式优先，保持该用例的键盘恢复意图），再断言规则版本与 `YQ-API-CONTRACT-1.2.0` 可见；返回后的焦点断言保持不变。
3. 全仓检索其他仍依赖“追溯信息”常显或完整时间描述的用例/单测，一并改写；不得删除断言或放宽到不再验证精确值。

只改测试与必要的可访问名称；不改本卡已通过的实现，除非为满足上述断言所必需（需在报告说明）。
