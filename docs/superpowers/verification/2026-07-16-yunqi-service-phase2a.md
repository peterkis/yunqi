# YunQi Service Phase 2-A Verification

## 审计范围与状态

- 验证日期：2026-07-16（Asia/Shanghai）。
- 分支：`main`。
- Phase 2-A 起点：`54872c1`。
- 本轮权威审计基线：`bf76655b77d3df3da48520ec451ce3a081465b5f`。
- 已审计实现范围：`54872c1..bf76655b77d3df3da48520ec451ce3a081465b5f`，共 46 个路径：1 个实施计划、3 个根工作区文件和 42 个 `packages/yunqi-service` 文件。
- Task 8 最小修复范围：根 `package.json` 的 `schema:validate` 命令，以及本验证文档。
- 本文记录当前 Phase 2-A 服务契约的 Task 8 验证证据；不替代后续独立最终审查，也不声明更广泛产品路线已经完成。

## 交付物清单

实现范围包含：

- `docs/superpowers/plans/2026-07-16-yunqi-service-phase2a.md`；
- 根 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`；
- `packages/yunqi-service` 的 Fastify 应用、生产入口、服务边界、DTO mapper、TypeBox schemas、OpenAPI 插件、浏览器契约、生成脚本、测试、README 与配置；
- 检入的 OpenAPI YAML 和机器生成 TypeScript client。

Task 8 要求的四个关键工件均存在：

| 路径 | 存在 | 字节数 |
|---|---:|---:|
| `packages/yunqi-service/openapi/yunqi-service.openapi.yaml` | True | 17,037 |
| `packages/yunqi-service/src/contracts/yunqi-api.ts` | True | 3,607 |
| `packages/yunqi-service/src/contracts/yunqi-types.ts` | True | 568 |
| `packages/yunqi-service/src/contracts/generated-client.ts` | True | 14,624 |

## Task 8 暴露并修复的验收门问题

首次独立执行 `npm run schema:validate` 时退出码为 1。原命令：

```text
pnpm --filter @yunqi/service test -- tests/openapi-contract.test.ts
```

实际展开为 `vitest run "--" "tests/openapi-contract.test.ts"`，因此运行了全部 10 个 service test files，而不是目标 contract suite；该轮 47 项测试中 46 项通过，`safety.test.ts` 在 5 秒处超时。此前同轮 `npm test` 已通过全部 10 files / 47 tests，因此失败证据指向脚本参数转发，而不是 OpenAPI contract 断言失败。

用直接执行形式验证假设：

```text
pnpm --filter @yunqi/service exec vitest run tests/openapi-contract.test.ts
```

结果为 exit 0，精确运行 1 file / 3 tests。随后只修改根脚本为该形式；未修改服务逻辑、测试内容或超时。修复后 `npm run schema:validate` 精确运行 1 file / 3 tests 并退出 0。

## 六个根验收门：修复后全量重跑

以下六条命令均在修复后分别、重新执行；没有沿用修复前结果。

| 精确命令 | Exit | Wall time | 结果 |
|---|---:|---:|---|
| `npm test` | 0 | 35.6 s | Domain 9 files / 103 tests；adapter 3 / 36；service 10 / 47；OpenAPI lint/check 完成 |
| `npm run typecheck` | 0 | 19.3 s | 三个 package 均先 build；Domain、adapter、service 的 source/test TypeScript checks 均通过 |
| `npm run build` | 0 | 7.2 s | Domain、tyme4ts adapter、service 均由 `tsc` 构建成功 |
| `npm run test:coverage` | 0 | 28.4 s | Domain 9 / 103；service 10 / 47；均达到配置阈值 |
| `npm run openapi:validate` | 0 | 9.5 s | Redocly 验证有效；3 个已知 warning；YAML/client drift check 通过 |
| `npm run schema:validate` | 0 | 6.3 s | 精确运行 `tests/openapi-contract.test.ts`：1 file / 3 tests |

`npm test` 合计执行 22 个 test files、186 项测试，均通过。

## 覆盖率

覆盖率来自修复后的 `npm run test:coverage`：

| Package | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `@yunqi/domain` | 96.27% (155/161) | 92.18% (59/64) | 100% (35/35) | 96.25% (154/160) |
| `@yunqi/service` | 96.02% (145/151) | 85.41% (41/48) | 93.18% (41/44) | 97.29% (144/148) |

Service 配置阈值为 lines/statements/functions 90%，branches 85%；上述 totals 均达到阈值。生产进程入口 `src/server.ts` 和机器生成的 `generated-client.ts` 按配置不计入 service coverage。

## 真实生产入口 smoke

修复后已存在 fresh build。随后通过 `TcpListener(..., 0)` 取得显式空闲 loopback 端口 `61623`，并使用以下等价启动方式运行真实构建产物：

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '61623'
Start-Process node -ArgumentList 'dist/server.js' `
  -WorkingDirectory 'packages/yunqi-service' `
  -WindowStyle Hidden -PassThru
```

实际 PID 为 `19860`。`src/server.ts` 的生产组合是 `tyme4tsCalendarProvider` 与 `Date.now`；smoke 未注入测试 provider 或固定 clock。

| 请求 | HTTP | 核验内容 |
|---|---:|---|
| `GET /health` | 200 | `SUCCESS`；空 message；`status=ok`；`apiVersion=v1` |
| `GET /api/v1/yunqi/year/2024` | 200 | `SUCCESS`；`year=2024`；`ruleVersion=V1.0-2026.7.7-implementation.1`；6 steps |
| `GET /api/v1/yunqi/current` | 200 | `SUCCESS`；`timezone=Asia/Shanghai`；运行时结果 year 2026 |
| `POST /api/v1/yunqi/calculate` with `{"dateTime":"2024-05-20T21:00:00"}` | 200 | `SUCCESS`；input epoch `1716210000000`；`Asia/Shanghai`；`currentStep=三之气` |
| `GET /docs/` | 200 | `text/html; charset=utf-8`；Swagger UI HTML |
| `GET /docs/yaml` | 200 | `application/x-yaml`；17,037 bytes；`openapi: 3.1.0` |

每个 JSON success route 均核验顶层字段精确为 `code`、`message`、`data`。完成请求后停止 PID `19860`，确认进程已退出；stderr 为空，stdout 包含 listen 记录。

第一次 smoke harness 将 `application/x-yaml` 的 PowerShell `System.Byte[]` 内容直接按字符串匹配，因此产生一次 harness false negative；诊断读取确认 endpoint 为 HTTP 200 且首行为 `openapi: 3.1.0`。改为显式 UTF-8 解码后完整六路重跑通过；两轮启动的进程均已停止。

## OpenAPI、schema 与浏览器 client

对检入 YAML 的结构化读取结果：

- OpenAPI：`3.1.0`；API metadata version：`1.0.0`；title：`YunQi Service API`。
- 精确包含 4 个 paths：`/health`、`/api/v1/yunqi/year/{year}`、`/api/v1/yunqi/current`、`/api/v1/yunqi/calculate`。
- 包含 16 个 component schemas；16 个顶层 object schemas 均为 closed object。
- `CalculateRequest` 有 local、`Z`、`+08:00` 三个 examples；`HealthSuccessResponse` 有 success envelope example；`ErrorResponse` 有 `INVALID_ARGUMENT`、`CALENDAR_PROVIDER_UNAVAILABLE`、`INTERNAL_ERROR` 三个 examples。
- 三个 YunQi operations 均声明 200、400、503、500；health 声明 200、500。
- `tests/openapi-contract.test.ts` 使用 AJV 2020 验证真实 Fastify annual response；同一 suite 校验 metadata、paths、response refs、examples 和检入 YAML。
- `npm run openapi:validate` 同时重新生成到临时目录并按字节比较 YAML 与 `generated-client.ts`，exit 0；两者当前无 drift。
- `generated-client.ts` 首部明确标注由 `openapi-typescript` 自动生成、不得直接编辑。
- 根 `typecheck` 包含 service `test:typecheck`；`contracts.typecheck.ts` 编译证明 `yunqiClient.getYear(2024)`、`getCurrent`、`calculate`、Axios-compatible structural transport 和 readonly query keys 的类型。
- `contracts.test.ts` 覆盖 Fetch JSON、Fetch error、Axios adapter、三个 client 方法和 TanStack Query-compatible options。
- 构建后的 `dist/contracts` 对 `fastify|node:` 扫描无匹配，浏览器契约没有 server/Node import。

## Mapper 与依赖方向

实际调用链为：

```text
routes/yunqi.ts
  -> services/yunqi-service.ts
  -> @yunqi/domain calculators
  -> mappers/yunqi-mapper.ts
  -> fresh API DTO
  -> success envelope
```

- 年度 route 调用 `calculateAnnualDto`，其结果由 `mapYearResult` 创建。
- current 与 calculate routes 调用 `calculateAtDto`，其结果由 `mapCalculationResult` 创建。
- routes 不直接调用 Domain calculator，也不直接返回 Domain result；route 对 `@yunqi/domain` 的唯一 import 是 `CalendarProvider` 类型。
- mapper 复制 instant、relation、step、suiYun、steps 和 explanations；mapper tests 验证 DTO 与 Domain result/arrays/currentStep 不共享目标引用，并保留精确 ruleVersion。
- `git diff --exit-code 54872c1..HEAD -- packages/yunqi-domain` 为 exit 0 且无输出；包含 Task 8 worktree 的同路径 diff 也为空。
- 对 `packages/yunqi-domain/src` 和 package metadata 扫描 Fastify、React/Vue、Express、数据库、service 反向依赖和 browser API，无匹配。

## 医疗安全与因果边界

执行：

```text
rg -n "诊断|疾病判断|治疗建议|个体预测|处方|方剂|中药|剂量|用药|预后" packages/yunqi-service/src packages/yunqi-service/openapi
```

无匹配。扩展扫描 `因为.*所以|导致|造成|引发|必然|吉凶|疾病|诊断|治疗|处方|方剂|中药|剂量|用药|预后|individual prediction|diagnos|disease judgment|treatment advice|prescri|dosage|prognos`，同样无匹配。

此外，`safety.test.ts` 对 year/current/calculate 的真实成功响应同时扫描中英文禁止词和禁止属性名。API 输出限定为时间事实、版本化规则映射、结构化客主关系和既有理论解释；本服务未新增诊断、疾病判断、治疗、处方、剂量、预后、个体预测或医学因果内容。

## 输出卫生与受保护文件

- `git ls-files` 对 `dist/`、`coverage/`、`node_modules/`、临时目录模式无匹配。
- `.gitignore` 明确忽略 `dist/` 与 `coverage/`；当前构建/覆盖率输出未被跟踪。
- Task 8 只修改根 `package.json` 并新增本验证文档；没有改动 Domain、生成工件或其他 Phase 2-A 源码。
- 以下三个原有未跟踪用户文件保持未跟踪，未加入 Task 8 commit：

| 路径 | SHA-256 | 审计时 LastWriteTime |
|---|---|---|
| `AGENTS.md` | `7492F0597F0BB8F3F8167519FF22911F3D4B163AE2E1722F4BA1F402E7129A7F` | 2026-07-16 00:44:28 +08:00 |
| `codex/prompts/Phase2-A_yunqi-service_Fastify_OpenAPI_JSONSchema_React_Contract_Prompt.md` | `DB759E2987CF2FD52A66FA71511779D244BB2912BF80EF3362F3933AECBC03A9` | 2026-07-16 08:16:43 +08:00 |
| `codex/prompts/codexpromptsPHASE1-YUNQI-DOMAIN-FIX.md` | `F314A677B8B926CAA7D785D5F9BD5D6E2C5A2D246DD9BBFA022C3DE336BF6810` | 2026-07-15 23:20:26 +08:00 |

## 有意保留的限制与 warnings

1. 公共 year contract 仅支持整数 `1901..2099`。扩大范围需要新的 calendar-adapter 边界证据和契约版本决策。
2. 无 offset 的 hospital-local input 以 `Asia/Shanghai` 解释；zone database 中不存在或有歧义的 wall time 返回 `INVALID_ARGUMENT`，调用方必须提供明确 RFC 3339 offset。
3. Redocly validation 有 3 个非阻断 warning：local server URL、health operation 无 4XX、`YearParams` component 因 Fastify 将 path parameter 展开而显示 unused。Redocly 仍报告 API description valid，exit 0；本轮未为消除 warning 而改变真实 local docs、health contract 或 schema source。
4. 仓库 service source/test 使用 TypeScript `7.0.2`。`openapi-typescript@7.13.0` 的生成进程通过 `openapi-typescript-ts` alias 隔离使用 TypeScript `5.9.3`；Node resolve hook 只重定向 generator 内部的 `typescript` import，不改变 Domain/service 的 TS7 build/typecheck。YAML 与生成 client 的字节级 drift gate 已通过。
5. Phase 2-A 只建立服务与浏览器消费契约；不包含 React 页面、持久化、认证、问诊工作流、自动诊断、自动辨证、处方或治疗决策。

## 最终 diff review

按 `54872c1..bf76655b77d3df3da48520ec451ce3a081465b5f` 对照批准设计、实施计划与 Task 8 brief，复核了实际 source、schemas、routes、mappers、contracts、generation scripts、tests、README、OpenAPI 和根 scripts。由于本任务明确禁止创建 subagent，`requesting-code-review` 的 plan-alignment、architecture、error handling、type safety、testing、production readiness 清单由本审计直接执行。

该复核未发现额外 P0–P2 correctness、contract、medical-safety 或 coverage gap。唯一复现的验收缺口是根 `schema:validate` 的参数转发，已以一行脚本修改修复，并在修复后重新执行全部六个根验收门。
