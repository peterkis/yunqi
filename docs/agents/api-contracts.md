# API、契约与客户端边界

修改Service、OpenAPI、Contracts或Client前读取
[ADR-002](../architecture/ADR-002-yunqi-contract-freeze.md)和
[当前契约](../contracts/YQ-API-CONTRACT-1.1.0.md)。

## 所有权

- `@yunqi/service` 是Fastify运行时与TypeBox schema唯一来源。
- `@yunqi/contracts` 从OpenAPI生成类型派生浏览器安全DTO facade；生成文件保持内部。
- `@yunqi/client` 只依赖Contracts，提供浏览器安全transport、client和query options。
- React/Next从Contracts导入DTO，从Client获得API能力；不得自行声明、复制或扩展DTO。
- Service、Domain、calendar adapter不得反向依赖Contracts或Client；Domain保持纯净。

## 冻结与升级

当前Contract为 `YQ-API-CONTRACT-1.1.0`，精确覆盖：

```text
GET /api/v1/yunqi/year/{year}
GET /api/v1/yunqi/current
POST /api/v1/yunqi/calculate
```

冻结投影包括路径、method、operationId、参数、请求体、响应状态及所有可达schema：
公共名称、required、enum、validation constraints、additionalProperties，以及投影约定的版本标识。
不能直接更新snapshot消除漂移。任何投影变化均须分配新Contract ID、按兼容性选package SemVer，
同步OpenAPI、生成类型、冻结基线、契约说明和测试，并记录消费方迁移影响。

保留旧freeze和append-only registry；新ID不使历史基线可改。
API工程冻结不代表规则已获专家冻结。路径/API、OpenAPI文档、Contract、规则和包版本各有含义。
1.1.0扩大1900–2100运气年范围；ruleVersion及R-21说明文字是显式可观察变化，
消费方的范围限制、精确文案/版本检查和缓存须按迁移说明处理。

## 服务与验证边界

业务时间只走[时间约束](rules-and-time.md)及Service normalizer。
年度路径标量转换不能扩大JSON请求体的类型；例如单元素数组dateTime也应返回400。
按README启动的Vite→真实Service同源GET/POST/错误链路由
[dev-proxy测试](../../tests/yunqi-dev-proxy.test.mjs)核验，DOM渲染不能替代网络连通。

资源防护沿用[ingress实现](../../packages/yunqi-service/src/plugins/ingress.ts)：
慢滴字节不能延长绝对生命周期；连接/活动请求和全局/单peer预算均需验证回收与恢复。
默认本机监听，转发头不作为信任来源。新增响应状态码同样需要契约升级；不能临时增加429绕开冻结。

## 检查与远端保护

使用根命令 `pnpm contracts:check`、`pnpm test:contract-governance`、`pnpm schema:validate`；
生成与分配新freeze只在已授权变更时使用 `pnpm contracts:generate` / `pnpm contracts:freeze`。
依赖导入由[契约依赖检查器](../../scripts/check-yunqi-contract-dependencies.mjs)检查。

main必须要求固定名 `quality-gates`，包含时间治理、契约生成/冻结漂移、测试、类型、覆盖率和schema；
ruleset/branch protection阻止失败PR合并及绕过直接push。仅有workflow文件不能证明远端配置生效，
报告远端保护或CI状态时需当前查询证据。
