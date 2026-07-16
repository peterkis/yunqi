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

The calculate endpoint accepts hospital-local `Asia/Shanghai` time:

    { "dateTime": "2024-05-20T21:00:00" }

It also accepts RFC 3339 absolute time:

    { "dateTime": "2024-05-20T13:00:00Z" }
    { "dateTime": "2024-05-20T21:00:00+08:00" }

Nonexistent or ambiguous local wall times are rejected; send an explicit
offset to identify the intended instant. The service converts all accepted
input into an absolute `YunQiInstant` before calling Domain.

## Browser contract

    import {
      createAxiosTransport,
      createYunQiClient,
      yunqiClient,
      yunqiQueryOptions,
    } from '@yunqi/service/contracts';

    const annual = await yunqiClient.getYear(2024);
    const yearOptions = yunqiQueryOptions.year(2024);
    const axiosClient = createYunQiClient(createAxiosTransport(axios));

`generated-client.ts` is generated from OpenAPI. Do not edit it by hand; run
`pnpm openapi:generate`.

## Safety boundary

The package does not produce diagnosis, disease judgment, prescriptions,
treatment advice, dosage, prognosis, or individual prediction. It does not
change or duplicate YunQi rules; `@yunqi/domain` remains the only calculation
layer. Outputs are limited to rule facts and theoretical explanations, and
doctors retain final interpretation.
