# @yunqi/client

Browser-safe typed client for the YunQi `/api/v1` endpoints.

Package `1.2.0` consumes `YQ-API-CONTRACT-1.2.0` through `@yunqi/contracts`.
Annual requests support YunQi years 1900–2100. See the
[current contract migration notes](../../docs/contracts/YQ-API-CONTRACT-1.2.0.md)
and [clinician-feedback plan](../../docs/plans/2026-11-16-clinician-feedback.md).
The [1.0.0](../../docs/contracts/YQ-API-CONTRACT-1.0.0.md) and
[1.1.0](../../docs/contracts/YQ-API-CONTRACT-1.1.0.md) notes remain historical references.

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
const learning = await yunqiClient.getLearningCurrent();
const selectedLearning = await yunqiClient.calculateLearning({
  dateTime: '2026-11-16T12:00:00+08:00',
});
const birthComparison = await yunqiClient.compareBirth({
  birthDate: '1990-08-15',
  // Add birthTime: '12:30:00' only when the time is known.
});
const questionnaire = await yunqiClient.getConstitutionQuestionnaire();

const yearOptions = yunqiQueryOptions.year(2024);
const axiosClient = createYunQiClient(createAxiosTransport(axios));
```

## Methods and request ownership

| Method | Endpoint |
| --- | --- |
| `getYear(year)` | `GET /api/v1/yunqi/year/{year}` |
| `getCurrent()` | `GET /api/v1/yunqi/current` |
| `calculate(request)` | `POST /api/v1/yunqi/calculate` |
| `getLearningCurrent()` | `GET /api/v1/yunqi/learning/current` |
| `calculateLearning(request)` | `POST /api/v1/yunqi/learning/calculate` |
| `compareBirth(request)` | `POST /api/v1/yunqi/learning/birth-comparison` |
| `getConstitutionQuestionnaire()` | `GET /api/v1/constitution/questionnaire` |
| `assessConstitution(request)` | `POST /api/v1/constitution/assess` |

Methods return the success envelope's `data`. Fetch failures use `YunQiApiError`;
the client does not reinterpret timestamps, infer birth candidates or perform
questionnaire scoring. Consumers implementing or mocking `YunQiClient` must
add the five new methods when upgrading. The existing `yunqiQueryOptions`
helpers cover annual and core-current reads; new feature hooks own the new
queries and explicit submissions.

Call `assessConstitution` only with the returned questionnaire ID, `sex` set
to `male` or `female`, and all 26 applicable answers as integers 1–5.
Missing or inapplicable answers are rejected by the Service. Do not insert
default scores or retain an answer for the other sex-specific question after
changing sex. Results preserve nine scores, tendencies and compatible types;
the [constitution rule note](../../rules/CONSTITUTION-GBT46939-2025.md)
documents the algorithm. Learning and birth comparisons use the separately
versioned [teaching rules](../../rules/LEARNING_RULES_V1.md).

The Axios adapter is structural: applications may pass an Axios-compatible
object without making Axios a client-package dependency. Query options are
plain structural objects and do not make TanStack Query a dependency.

DTOs are owned by `@yunqi/contracts` and are not re-declared here:

```ts
import type { YunQiCalculationDto } from '@yunqi/contracts';
```

React must display `calculation.input.localTime`. It must not construct a
browser-local `Date` from `epochMilliseconds`.
Learning time is `learning.facts.input.localTime`. Unknown birth times must
be shown as the returned candidate intervals, not as their internal sampling
times. Birth and answer inputs belong in POST bodies, not URLs or persistent
query caches. The new endpoints return `Cache-Control: no-store`.

For the bundled Workbench, follow the [root startup instructions](../../README.md#workbench-development):
build the workspace, start the Service, then start Vite with its same-origin
proxy for both YunQi and constitution paths.

From the repository root:

```text
pnpm --filter @yunqi/client build
pnpm --filter @yunqi/client test
pnpm --filter @yunqi/client test:typecheck
pnpm --filter @yunqi/client test:coverage
```
