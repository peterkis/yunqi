# M1-e 院内现场验证

按 [M1-e 第 6 项](../cards/M1-e-polish.md#6-院内现场验证人工不阻塞代码合并)记录。“实际档位 · 原因”填写“计算说明与版本”中的动效诊断行。

| 环境 | 期望档位 | 实际档位 · 原因 | 切 tab / 作答 / 结果揭示主观流畅度 | 截图 | 状态 |
|---|---|---|---|---|---|
| 门诊常用 PC 本机，Win10 + WebView2 / Chrome 最新版 | full | | | | NOT_RUN |
| 同一 PC 经 RDP 远程桌面访问 | reduced（动中测命中） | | | | NOT_RUN |
| Citrix / 云桌面（如院内在用） | reduced | | | | NOT_RUN |
| Win7 + Chrome 109 / 360 极速模式（如仍在用） | reduced（no-view-transition） | | | | NOT_RUN |
| Windows 高对比度主题 | off（forced-colors） | | | | NOT_RUN |
| 系统开启“减少动画” | reduced（system） | | | | NOT_RUN |
