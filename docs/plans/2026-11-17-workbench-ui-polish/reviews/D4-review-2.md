# D4 评审 2（Claude）

结论：**通过**（评审方补正 1 处）。胶囊恢复 400×`--pill-height`、`shadow-float`，收起态宿主窗口改为 416×80；证据迁至 `evidence/`。

评审方补正：返工把“更多”行焦点环改成了 `:focus`，会让鼠标点击也显示焦点环（与 D5 第 16 项冲突）。根因是用例先鼠标点击、再程序 `focus()`，
Chromium 此时不判定 `:focus-visible`，显示 UA 默认环（3px）。已删除该 `:focus` 覆盖，行焦点沿用 `.panel-shell :focus-visible`；
用例在逐行聚焦前按一次 Tab 进入键盘模态。重新构建后 `pnpm test:browser` 195/195 通过。

待决（Tauri 阶段）：416×80 只留 8px 外边距，`shadow-float`（0 6px 20px）的模糊尾部会被宿主窗口裁掉一部分。
宿主窗口最终尺寸（或改用原生窗口阴影）在 Tauri 外壳阶段决定。
