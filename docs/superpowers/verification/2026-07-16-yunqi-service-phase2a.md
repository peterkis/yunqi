# YunQi Service Phase 2-A Verification

## 审计范围与状态

- 验证日期：2026-07-16（Asia/Shanghai）。
- 分支：`main`。
- Phase 2-A 起点：`54872c1`。
- 最终审查前已提交基线：`e80ac2abc9877e45b93cfe8e2f70dc03f4562e7f`。
- 已审计范围：`54872c1` 之后的 Phase 2-A 设计、计划、实现、Task 8 验证，以及最终独立审查修复；Domain 路径不在变更范围内。
- 最终修复范围：根验收脚本自包含构建、Service 请求错误分类、输入年份前置边界、服务自有参数错误类型及对应测试。
- 本文记录当前 Phase 2-A 服务契约的最终验证证据；不声明更广泛产品路线已经完成。

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
| `npm test` | 0 | 15.8 s | Domain 9 files / 103 tests；adapter 3 / 36；service 10 / 66；OpenAPI lint/check 完成 |
| `npm run typecheck` | 0 | 9.2 s | 三个 package 均先 build；Domain、adapter、service 的 source/test TypeScript checks 均通过 |
| `npm run build` | 0 | 4.3 s | Domain、tyme4ts adapter、service 均由 `tsc` 构建成功 |
| `npm run test:coverage` | 0 | 18.0 s | Domain 9 / 103；service 10 / 66；均达到配置阈值 |
| `npm run openapi:validate` | 0 | 14.0 s | 先 clean-capable build；Redocly 验证有效；3 个已知 warning；YAML/client drift check 通过 |
| `npm run schema:validate` | 0 | 8.4 s | 先 clean-capable build；精确运行 `tests/openapi-contract.test.ts`：1 file / 3 tests |

`npm test` 合计执行 22 个 test files、205 项测试，均通过。

## 覆盖率

覆盖率来自修复后的 `npm run test:coverage`：

| Package | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `@yunqi/domain` | 96.27% (155/161) | 92.18% (59/64) | 100% (35/35) | 96.25% (154/160) |
| `@yunqi/service` | 96.51% (166/172) | 88.52% (54/61) | 94% (47/50) | 97.63% (165/169) |

Service 配置阈值为 lines/statements/functions 90%，branches 85%；上述 totals 均达到阈值。生产进程入口 `src/server.ts` 和机器生成的 `generated-client.ts` 按配置不计入 service coverage。

## 真实生产入口 smoke

最终修复及六个根门禁完成后，通过 `TcpListener(..., 0)` 取得显式空闲 loopback 端口 `64157`，并使用以下等价启动方式运行真实构建产物：

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '64157'
Start-Process node -ArgumentList 'dist/server.js' `
  -WorkingDirectory 'packages/yunqi-service' `
  -WindowStyle Hidden -PassThru
```

实际 PID 为 `54692`。`src/server.ts` 的生产组合是 `tyme4tsCalendarProvider` 与 `Date.now`；smoke 未注入测试 provider 或固定 clock。

| 请求 | HTTP | 核验内容 |
|---|---:|---|
| `GET /health` | 200 | 真实生产入口可用 |
| `GET /api/v1/yunqi/year/2024` | 200 | 年度契约可用 |
| `GET /api/v1/yunqi/current` | 200 | 实时时间契约可用 |
| `POST /api/v1/yunqi/calculate` with `{"dateTime":"2024-05-20T21:00:00"}` | 200 | hospital-local 输入成功，response `code=SUCCESS`、`data.year=2024` |
| `GET /docs/` | 200 | Swagger UI 可用 |
| `GET /docs/json` | 200 | 运行时 JSON OpenAPI 可用 |
| `GET /docs/yaml` | 200 | 运行时 YAML OpenAPI 可用 |
| malformed JSON `POST /api/v1/yunqi/calculate` | 400 | 统一 `INVALID_ARGUMENT`，message 为 `请求参数无效` |

完成请求后停止 PID `54692`，并确认 `HasExited=True`。

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

此外，`safety.test.ts` 对 year/current/calculate 的真实成功响应同时扫描中英文禁止词和禁止属性名，并以 10 个 sentinel 锁定独立的“疾病/预测”、`disease/predict` 及“导致/造成/引发/必然/因为…所以/because…therefore”等因果措辞。API 输出限定为时间事实、版本化规则映射、结构化客主关系和既有理论解释；本服务未新增诊断、疾病判断、治疗、处方、剂量、预后、个体预测或医学因果内容。

## 输出卫生与受保护文件

- `git ls-files` 对 `dist/`、`coverage/`、`node_modules/`、临时目录模式无匹配。
- `.gitignore` 明确忽略 `dist/` 与 `coverage/`；当前构建/覆盖率输出未被跟踪。
- 最终修复只修改根 `package.json`、Service 错误/时间边界实现及对应测试，并更新本验证文档；没有改动 Domain 或生成工件。
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
5. 当前 contract suite 直接以 AJV 验证 annual 的真实运行时响应；其余成功/错误响应由共享 TypeBox schema、route schema、envelope assertions 和 OpenAPI drift gate 覆盖，尚未逐个对检入 OpenAPI schema 做直接 AJV runtime validation。这是非阻断的测试深度限制。
6. Phase 2-A 只建立服务与浏览器消费契约；不包含 React 页面、持久化、认证、问诊工作流、自动诊断、自动辨证、处方或治疗决策。

## 最终 diff review

两轮独立最终审查对照批准规格、实施计划和实际 diff，发现 4 个重要问题，均已纳入同一修复波次：

1. malformed/empty JSON 以及不支持 media type 的 Fastify 4xx 会落入 500；现在按 Fastify request error 统一映射为不泄漏 parser 文本的 400。
2. 任意内部 `RangeError` 曾被当成客户端 400 并泄漏 message；现在只有服务自有 `InvalidArgumentError` 可映射 400，内部错误保持脱敏 500，provider 错误保持脱敏 503。
3. 远离支持范围的 `/calculate` 输入可能先访问 provider 并返回 503；现在先按 `Asia/Shanghai` civil year 做可解析范围检查，再调用 Domain，同时保留 Domain 结果 year 的后置断言。`2100-01-01T00:00:00+08:00` 映射到受支持的运气年 2099，仍返回 200。
4. 根 `openapi:validate` 与 `schema:validate` 依赖已有 `dist`；现在两条命令均先执行根 build。删除三个 package 的精确 `dist` 目录后分别独立运行，两条命令均从缺失 `dist` 状态 exit 0。

该修复按测试先行执行：聚焦 RED 为 4 files / 34 tests，其中 17 failed、17 passed；实现后 GREEN 为 4 files / 35 tests 全通过。随后重新运行 service 全套 10 files / 66 tests、source/test typecheck、六个根验收门、真实生产入口 smoke 和 Domain 零差异检查，均通过。

修复提交 `76bb7e2` 后，新的独立代理对 `e80ac2a..76bb7e2` 做只读复审，结论为 `APPROVED`，Critical 0、Important 0，并逐项确认上述 4 个 Important finding 及 safety detector 补强均已闭环。仅记录一项非阻断测试细节：名为 empty JSON document 的 regression case 使用 whitespace-only body，而不是 zero-length body；实现按 Fastify request 4xx 通用分类，缺失 body 仍由 schema validation 分类为 400，因此不影响验收。
