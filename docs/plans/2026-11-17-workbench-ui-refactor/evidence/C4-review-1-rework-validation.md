# C4 第 1 轮返工验证（2026-11-17）

工作树：`/Users/petervans/Projects/YunQi/.claude/worktrees/ui-c4`。
分支：`feat/workbench-ui-refactor-c4`；HEAD：`502fccfc2ba47d75f7650310ea67d896145888d1`。
本轮在上轮未提交变更上继续修改，未提交、推送、切换分支或修改 Git 配置。

## 完成内容

| 必改项 | 状态 | 修改与验证边界 |
| --- | --- | --- |
| 提交中用例拦截错误 | DONE | 改为 URL pathname 的 `/learning/birth-comparison` 后缀匹配，覆盖 Client 实际的 `/api/v1/yunqi/learning/birth-comparison`。增加响应未交付、`aria-busy=true`、无旧结果及放行后仍仅一条请求的断言。Node 探针核对实际源码中的匹配函数与挂起回调；浏览器尚未执行 |
| 共享走查仍断言隐藏标题 | DONE | 切换先天分段后，检查有名称的 main 保持焦点；日期输入可见、可用且在视口中，对照提交入口也在视口中。不再以 visually-hidden 标题作为可见内容 |
| 对照值字号与 Button 规格 | DONE | 值使用 `--type-body-strong-size/line/weight`（14/1.5/600）；输入使用 body，外部标题使用 body-strong；删除 C4 对 Button 字号和内距的覆盖。默认屏五档及视觉断言见下文 |

评分挂起用例的 `/api/v1/constitution/assess` 已与 Client 实际路径核对一致，未修改。
多候选、输入清空、重复提交保护及同页测评生命周期继续由既有测试覆盖。

## 本轮文件清单

仅新增或增改以下六份文件；上轮其余变更保留。

1. `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.tsx`：有结果时重新对照使用 C1 文字按钮，避免默认屏额外出现次按钮的 13.5px。
2. `apps/yunqi-workbench/src/styles/views/birth.css`：值、输入、标题使用已有 type 令牌；恢复 C1 Button 规格；默认摘句采用 14px 令牌。
3. `tests/browser/birth-assessment.flows.spec.mjs`：修复匹配函数，增强真实响应挂起和重复提交断言。
4. `tests/browser/ux-walkthrough.flows.spec.mjs`：仅迁移出生分段的可见内容断言，保留焦点与视口强度。
5. `tests/browser/workbench.visual.spec.mjs`：仅增强出生状态，检查十个值的 14px / 600 / 21px 行高，并明确核对默认屏五档字号；保留原有最多五级断言。
6. `docs/plans/2026-11-17-workbench-ui-refactor/evidence/C4-review-1-rework-validation.md`：本轮记录。

未编辑上轮 `C4-validation.md` 或评审 `C4-review-1.md`；未修改其他视图、共享设计组件、API、规则或依赖。

## 检查结果

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm --filter @yunqi/workbench test` | 0 | PASS：51 个文件、234 项测试 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 | PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 | PASS |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 | PASS：语句 99.11%、分支 97.24%、函数 99.16%、行 99.06%；阈值和 exclude 未改 |
| `pnpm --filter @yunqi/workbench build` | 0 | PASS：158 modules，产物见下文 |
| `pnpm test:workbench-governance` | 0 | PASS：293 项及源码检查器 |
| `pnpm test:time-governance` | 0 | PASS：12 项及源码检查器 |
| `pnpm test:project-guidance` | 0 | PASS：15 项及文档检查器 |
| `node --check tests/browser/birth-assessment.flows.spec.mjs` | 0 | PASS：语法 |
| `node --check tests/browser/ux-walkthrough.flows.spec.mjs` | 0 | PASS：语法 |
| `node --check tests/browser/workbench.visual.spec.mjs` | 0 | PASS：语法 |
| `node --input-type=module`（下方源码/回调探针） | 0 | PASS：路径匹配及回调挂起控制；无浏览器、HTTP 或真实 UI |
| `pnpm exec playwright test --list tests/browser/birth-assessment.flows.spec.mjs tests/browser/ux-walkthrough.flows.spec.mjs tests/browser/workbench.visual.spec.mjs --grep 'birth\|panel navigation'` | 0 | PASS：发现 46 项（6 个流程及 40 个视觉项目/状态组合），仅发现，不是执行通过 |
| `git diff --check` | 0 | PASS |
| `pnpm test:browser` | — | NOT_RUN：按用户要求，当前沙箱不启动 Chromium，由评审方运行 |

### 保留的失败与证据限制

评审方在本机对上轮代码运行 `pnpm test:browser`：**FAIL，退出码 1，152 通过、2 失败**。
该结果保留在 `docs/plans/2026-11-17-workbench-ui-refactor/reviews/C4-review-1.md`；
本轮 Node 探针、单测和用例发现均不能替代修复后的浏览器执行，也不覆盖此历史失败。
依据评审已定位的根因与本轮源码核对直接修复，未在受限沙箱中重复浏览器复现。

### 无浏览器探针

通过 TypeScript AST 从 Client 提取实际路径，从浏览器用例提取实际 matcher 与回调，再执行回调控制流。
旧模式仅有开头的 `**`，其余为固定后缀；检查旧固定后缀与真实路径不匹配。
这里没有模拟浏览器事件或声称验证控件状态，控件断言仍留在 Playwright 用例中。

命令：`node --input-type=module`，输入脚本如下：

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function find(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => find(child, predicate));
}
const client = ts.createSourceFile('client.ts', readFileSync('packages/yunqi-client/src/yunqi-api.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const method = find(client, node => ts.isMethodDeclaration(node) && node.name.getText(client) === 'compareBirth');
const path = find(method, node => ts.isPropertyAssignment(node) && node.name.getText(client) === 'path').initializer.text;
const flows = ts.createSourceFile('flows.mjs', readFileSync('tests/browser/birth-assessment.flows.spec.mjs', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const route = find(flows, node => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.getText(flows) === 'page.route' && node.arguments[0].getText(flows).includes('birth-comparison'));
const matcher = vm.runInNewContext(`(${route.arguments[0].getText(flows)})`);
assert.equal(matcher(new URL(path, 'http://127.0.0.1')), true);
assert.equal(matcher(new URL('/api/v1/constitution/assess', 'http://127.0.0.1')), false);
const oldLiteralSuffix = '/api/v1/learning/birth-comparison';
assert.equal(new URL(path, 'http://127.0.0.1').href.endsWith(oldLiteralSuffix), false);
let release;
let reached;
const hold = new Promise(resolve => { release = resolve; });
const receivedStatus = new Promise(resolve => { reached = resolve; });
const handler = vm.runInNewContext(`(${route.arguments[1].getText(flows)})`, { hold, received: reached });
let fulfilled = 0;
const response = { status: () => 200 };
const delivery = handler({ fetch: async () => response, fulfill: async value => { assert.equal(value.response, response); fulfilled += 1; } });
assert.equal(await receivedStatus, 200);
assert.equal(fulfilled, 0);
release();
await delivery;
assert.equal(fulfilled, 1);
console.log(`PASS: Client ${path} matches the current route predicate; the old literal suffix does not match.`);
console.log('PASS: Actual route handler fetches the response, holds delivery until release, then fulfills once. No browser or HTTP was started.');
```

## 字号取舍与原型差异

本记录取代上轮记录中“把值和按钮统一为 13px”的实现选择；原记录不改写。
默认对照屏（未打开量表）使用以下五档，不引入新的通用字号：

| 字号 | 来源与用途 |
| --- | --- |
| 24px | `type-display-md`：列头干支 |
| 14px | `type-body-strong`：对照值、C4 外部标题；`type-body`：输入与摘句字号；主按钮使用 C1 原规格 |
| 13px | 设计 README“数字与干支同排”的明确年份规格，以及 C1 文字按钮规格；只保留年份专用变量，不作为通用 UI 字号 |
| 12px | `type-caption` / `type-chip`：方向说明、标签、普通容器字号 |
| 11px | `type-label` / `type-meta`：眉标、出处、时间与声明 |

为合并字号档位，默认摘句由 13.5px 改用已有的 14px body 字号令牌，仍保留宋体、quote 字重和行距；
有结果时“查看出生与当前运气”改用既有文字按钮，避免引入次按钮的 13.5px。
Button 的字体、字重、高度和内距由组件原规格控制；结束测评及原文空状态仍使用原次按钮规格。
对照表年份 13px 是设计规范明示的排版规格，并非给对照值新增的字号令牌。

## 待决事项

- 本轮浏览器验证仍为 NOT_RUN；须由评审方运行完整 `pnpm test:browser`，确认挂起分支、分段焦点/可见内容、五档字体及控件排版。
- 五档字号和对照值 14/600 已写成更强的视觉断言，未删断言、未放宽门槛、未增加重试或调整超时。
- 未新增业务、API、存储或临床能力；C3/C5 并行合并的既有注意事项继续见上轮记录。

## 源与构建快照

| 本轮源码 | SHA-256 |
| --- | --- |
| `BirthComparisonPage.tsx` | `985ac9e856f94523047efbfdeeb50996c84c7888cd8caf050b2fc8b3c4b9f4c6` |
| `birth.css` | `1f9591a8c00d0c75f617a5e04ad0fac7064bbca9fe02b849a3a1d4a5d28db27f` |
| `birth-assessment.flows.spec.mjs` | `eb763789394fb561efdbbb4344888dfabcc60ce606c5ff3da742beafa9926591` |
| `ux-walkthrough.flows.spec.mjs` | `b4a1575945badac1aa9d37cc0b5683c6ed697cf1996e7dfae31762a458ca53f7` |
| `workbench.visual.spec.mjs` | `dfe29b22becc4450dff93a193e31e4c962d4038a36b8265727f5933cb82feb83` |

最终产物（本轮 build，未用于本轮浏览器验收）：

- `dist/assets/index-Br7S7xan.css`：SHA-256 `013b7d2b8e37d0a3962e67e95b71aff9a49ac93f60de996c0a28e00f7cb84a92`。
- `dist/assets/index-CwWXnP2r.js`：SHA-256 `63848bd233f032c19d311270c5f1851a8c53390dfb3866705752a5a07e0a4763`。

本轮无 Service、HTTP、WebSocket 或浏览器监听进程待清理。
