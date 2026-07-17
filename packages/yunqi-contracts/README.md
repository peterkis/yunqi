# @yunqi/contracts

Browser-safe public DTO facade for `YQ-API-CONTRACT-1.0.0`.

The package contains no YunQi rules, runtime time conversion, Fastify,
React, Axios, TanStack Query, Domain, or Service dependency. Its public types
are derived from the internal OpenAPI-generated file:

```text
src/generated/openapi.ts
```

Consumers import only from the package root:

```ts
import {
  YUNQI_API_CONTRACT_ID,
  type YunQiCalculationDto,
  type YunQiCalculationInputTimeDto,
  type YunQiTimeDto,
} from '@yunqi/contracts';
```

Do not import generated `components` or `paths`, and do not edit generated
types by hand.

The one public time wire schema is `YunQiTimeDto`.
`YunQiCalculationInputTimeDto` and `YunQiBoundaryTimeDto` are semantic
TypeScript aliases, not duplicate OpenAPI schemas.

The canonical calculation display value is:

```ts
result.input.localTime
```

Do not add `result.calendarTime`, `timezone`, or frontend Date/IANA
reinterpretation.

From the repository root:

```text
pnpm contracts:generate
pnpm contracts:check
pnpm --filter @yunqi/contracts build
pnpm --filter @yunqi/contracts test:typecheck
```

The machine freeze is:

```text
contract/YQ-API-CONTRACT-1.0.0.freeze.json
contract/registry.json
```

The registry is append-only. `contracts:freeze` cannot overwrite or recreate a
known ID with different content.
