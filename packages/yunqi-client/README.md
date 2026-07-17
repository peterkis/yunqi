# @yunqi/client

Browser-safe typed client for the YunQi `/api/v1` endpoints.

The package's only runtime workspace dependency is `@yunqi/contracts`. It does
not depend on Fastify, Domain, Service, React, Axios, or TanStack Query.

```ts
import {
  createAxiosTransport,
  createYunQiClient,
  yunqiClient,
  yunqiQueryOptions,
} from '@yunqi/client';

const year = await yunqiClient.getYear(2024);
const current = await yunqiClient.getCurrent();
const calculation = await yunqiClient.calculate({
  dateTime: '2024-05-20T21:00:00',
});

const yearOptions = yunqiQueryOptions.year(2024);
const axiosClient = createYunQiClient(createAxiosTransport(axios));
```

The Axios adapter is structural: applications may pass an Axios-compatible
object without making Axios a client-package dependency. Query options are
plain structural objects and do not make TanStack Query a dependency.

DTOs are owned by `@yunqi/contracts` and are not re-declared here:

```ts
import type { YunQiCalculationDto } from '@yunqi/contracts';
```

React must display `calculation.input.localTime`. It must not construct a
browser-local `Date` from `epochMilliseconds`.

From the repository root:

```text
pnpm --filter @yunqi/client build
pnpm --filter @yunqi/client test
pnpm --filter @yunqi/client test:typecheck
pnpm --filter @yunqi/client test:coverage
```
