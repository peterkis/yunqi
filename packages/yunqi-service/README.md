# @yunqi/service

Fastify 5 service-contract package for the accepted `@yunqi/domain` facts.
It exposes time boundaries, versioned rule mappings, sourced learning material,
birth/current comparisons and constitution questionnaire assessment.

Service package `2.3.0` implements
[`YQ-API-CONTRACT-1.3.0`](../../docs/contracts/YQ-API-CONTRACT-1.3.0.md).
The OpenAPI dialect is `3.1.0` and its document release is `1.5.0`; API paths
remain under `/api/v1`. The [implementation plan](../../docs/plans/2026-11-16-clinician-feedback.md)
records the clinician-feedback scope. The original
[1.0.0](../../docs/contracts/YQ-API-CONTRACT-1.0.0.md) and
[1.1.0](../../docs/contracts/YQ-API-CONTRACT-1.1.0.md) contract notes remain historical references.

The standalone listener defaults to `127.0.0.1`; set `HOST` explicitly when
network access is required. Each service instance enforces 128 connections,
32 active requests, a 10-second absolute socket/request lifetime, a 5-second
idle timeout, and fixed one-second request budgets of 60 globally and 20 per
socket peer. Forwarded headers do not establish peer identity. Overload uses
the existing `503`/`INTERNAL_ERROR` envelope with `Retry-After`; the frozen
business schemas and status set are unchanged. Embedded callers can supply
positive integer `buildApp({ ingress: ... })` limits. Timers measure resource
lifetime only and do not participate in YunQi business-time interpretation.

These bounds apply per process, including health/docs requests. All clients
behind one proxy source IP share one peer budget; opening more connections
does not change that budget. No trusted-proxy mode is enabled. Fixed windows allow a boundary burst, and
timers cannot preempt a synchronous calculation already running. Capacity
and multi-instance ingress budgets still require deployment load testing.

## Commands

Use Node.js 22 or newer and pnpm 10.32.1. From the repository root:

    pnpm install --frozen-lockfile
    pnpm build
    pnpm test
    pnpm typecheck
    pnpm --filter @yunqi/service start
    pnpm openapi:generate

Swagger UI is served at `/docs/`. The checked-in contract is
[`openapi/yunqi-service.openapi.yaml`](openapi/yunqi-service.openapi.yaml).
The default listener is `http://127.0.0.1:3000`; `HOST` and `PORT` configure it.
Run `pnpm --filter @yunqi/workbench dev` in another terminal for the UI.
Vite proxies both `/api/v1/yunqi/` and `/api/v1/constitution/` to the Service;
see the [root startup guide](../../README.md#workbench-development) for a custom port.

## Endpoints

| Method | Path | Result |
| --- | --- | --- |
| GET | `/health` | Runtime health |
| GET | `/api/v1/yunqi/year/:year` | Annual core facts for YunQi years 1900–2100 |
| GET | `/api/v1/yunqi/current` | Current core facts |
| POST | `/api/v1/yunqi/calculate` | Core facts at the requested time |
| GET | `/api/v1/yunqi/learning/current` | Current facts, five movements, relations and matched classical passages |
| POST | `/api/v1/yunqi/learning/calculate` | Learning result at the requested time |
| POST | `/api/v1/yunqi/learning/birth-comparison` | Birth-period candidates compared with a current snapshot |
| GET | `/api/v1/constitution/questionnaire` | Versioned questions, options and scale mappings |
| POST | `/api/v1/constitution/assess` | All nine assessment scores, classifications and compatible types |

Success responses use:

    { "code": "SUCCESS", "message": "", "data": {} }

Errors use:

    { "code": "INVALID_ARGUMENT", "message": "...", "details": {} }

## Date-time input

Both calculate endpoints use fixed Beijing Standard Time, UTC+08:00. Historical
IANA `Asia/Shanghai` daylight-saving rules and the server's default time zone
do not participate in YunQi calculation.

It accepts suffix-free fixed Beijing time:

    { "dateTime": "2024-05-20T21:00:00" }

It also accepts the exact equivalent `Z` or `+08:00` forms:

    { "dateTime": "2024-05-20T13:00:00Z" }
    { "dateTime": "2024-05-20T21:00:00+08:00" }

Fractional seconds, when present, must contain exactly three digits. Other
numeric offsets, basic offsets such as `+0800`, space-separated values, slash
dates, and locale formats are rejected.

All accepted values flow through the Business Time Normalizer into
`YunQiCalendarTime`, then through the Domain's authoritative
`calculateYunQiByCalendarTime()` entry. The runtime clock supplies epoch
milliseconds only and is normalized through the same fixed-offset path.

The supported calculation interval starts at the actual 1900 大寒 boundary
and ends immediately before the actual 2101 大寒 boundary. The first boundary
is included; the last is excluded. A civil date in early 2101 can therefore
belong to supported YunQi year 2100. Both `/calculate` and `/current` use this
same interval; dates before 1900 大寒 or at/after 2101 大寒 return `400`.

Public time values use:

    {
      "localTime": "2024-05-20T21:00:00+08:00",
      "epochMilliseconds": 1716210000000,
      "offset": "+08:00",
      "calendarTimeStandard": "BeijingStandardTime+08:00"
    }

Core facts retain `YQ-MVP-RULES-1.1.0`; the approved guest-generates-host label
is `客生主，相得`. Contract 1.3.0 adds six-qi boundary terms and input-relative
`currentStepProgress` to calculations, including learning/birth `facts`.
Annual results carry boundary terms without progress. Learning outputs add
movement boundary labels, neutral host/guest movement relations and
`currentMovementProgress`; these fields map Domain facts directly.
Learning and constitution outputs carry their separate versions.

## Learning and birth comparison

Learning responses contain core `facts`, separate annual and current-qi
relations, the current movement, all five movements, and classical excerpts
with reading explanations and source links. The teaching movement boundaries
and interpretation status are explicit in
[YQ-LEARNING-RULES-1.2.0](../../rules/LEARNING_RULES_V1_2.md).

Birth comparison accepts:

```json
{ "birthDate": "1990-08-15", "birthTime": "12:30:00" }
```

`birthDate` must be a real Gregorian `YYYY-MM-DD`; optional `birthTime` must
be `HH:mm:ss`, interpreted at fixed UTC+08:00. Future inputs are rejected.
Omitting the time preserves all supported candidate intervals for that day,
including year, qi and movement boundaries. An internal sampling instant is
not a known birth time. A precise-time candidate has equal `from` and `until`;
an unknown-time candidate is an interval. The response includes a snapshot of
current facts for comparison, not an individual disease prediction.

The full queried birth period must be supported: a date-only request for the
1900 大寒 day includes time in unsupported YunQi year 1899 and is rejected;
an explicitly known time at or after that boundary can be assessed. For
today, the date-only interval stops at the request's current time.

## Constitution assessment

The questionnaire uses the final `GB/T 46939-2025` standard with questionnaire
ID `GBT46939-2025` and implementation version `YQ-CONSTITUTION-1.0.0`.
Its 27 distinct questions include two alternative sex-specific questions,
so a respondent answers 26 applicable questions. The public standard source,
reverse items and threshold rules are recorded in the
[constitution rule note](../../rules/CONSTITUTION-GBT46939-2025.md).
After the initially offline Windows device became available, the user's
same-edition PDF was checked against Chapter 5 and Appendix A. Its checksum,
the initial extraction failure and the subsequent visual verification are
recorded in that rule note; the original PDF was not modified.

Submit `{ questionnaireId, sex, answers }`, with `sex` equal to `male` or
`female` and `answers` a complete map of applicable question IDs to JSON
integers 1–5. Missing, unknown or inapplicable answers, numeric strings,
booleans, arrays and invalid values return `400 INVALID_ARGUMENT`.
No unanswered item receives a default score. Results include all nine raw
and unrounded converted scores; classification uses unrounded thresholds
and retains compatible and tendency types instead of choosing one maximum.

All five learning/constitution endpoints return `Cache-Control: no-store`.
Birth and answer inputs use POST bodies, are not persisted or linked to
patient identities, and detailed answers are not echoed in the assessment.

## Browser contracts and client

    import {
      type YunQiCalculationDto,
      type YunQiTimeDto,
    } from '@yunqi/contracts';
    import {
      createAxiosTransport,
      createYunQiClient,
      yunqiClient,
      yunqiQueryOptions,
    } from '@yunqi/client';

    const annual = await yunqiClient.getYear(2024);
    const learning = await yunqiClient.getLearningCurrent();
    const comparison = await yunqiClient.compareBirth({ birthDate: '1990-08-15' });
    const questionnaire = await yunqiClient.getConstitutionQuestionnaire();
    const yearOptions = yunqiQueryOptions.year(2024);
    const axiosClient = createYunQiClient(createAxiosTransport(axios));

`@yunqi/contracts` derives its public facade from an internal generated
OpenAPI file. Do not edit the generated file by hand; run
`pnpm contracts:generate`.

The previous Service-owned contract subpath has no compatibility re-export.
Phase3 consumers import DTOs from `@yunqi/contracts` and browser client
behavior from `@yunqi/client`.

## Safety boundary

The package does not produce diagnosis, disease judgment, prescriptions,
treatment advice, dosage, prognosis, or individual prediction. It does not
change or duplicate YunQi rules; `@yunqi/domain` remains the only calculation
layer. Outputs are limited to rule facts, theoretical explanations and questionnaire
assessment. A birth-period comparison does not determine a constitution;
questionnaire results do not establish a diagnosis. The teaching movement
method and excerpts still require expert review, and doctors retain final
interpretation.
