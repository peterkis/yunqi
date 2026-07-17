# @yunqi/service

Fastify 5 service-contract package for the accepted `@yunqi/domain` facts.
It exposes time boundaries and versioned rule mappings only.

## Commands

From the repository root:

    pnpm install --frozen-lockfile
    pnpm build
    pnpm test
    pnpm typecheck
    pnpm --filter @yunqi/service start
    pnpm openapi:generate

Swagger UI is served at `/docs/`. The checked-in contract is
`openapi/yunqi-service.openapi.yaml`.

## Endpoints

- `GET /health`
- `GET /api/v1/yunqi/year/:year`, where `year` is 1901-2099
- `GET /api/v1/yunqi/current`
- `POST /api/v1/yunqi/calculate`

Success responses use:

    { "code": "SUCCESS", "message": "", "data": {} }

Errors use:

    { "code": "INVALID_ARGUMENT", "message": "...", "details": {} }

## Date-time input

The calculate endpoint uses fixed Beijing Standard Time, UTC+08:00. Historical
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

Public time values use:

    {
      "localTime": "2024-05-20T21:00:00+08:00",
      "epochMilliseconds": 1716210000000,
      "offset": "+08:00",
      "calendarTimeStandard": "BeijingStandardTime+08:00"
    }

The OpenAPI dialect remains 3.1.0, the contract document release is 1.2.0,
the business Contract ID is `YQ-API-CONTRACT-1.0.0`, and API paths remain
under `/api/v1`.

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
layer. Outputs are limited to rule facts and theoretical explanations, and
doctors retain final interpretation.
