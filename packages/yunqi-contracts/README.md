# @yunqi/contracts

Browser-safe public DTO facade, package `1.2.0`, for
[`YQ-API-CONTRACT-1.2.0`](../../docs/contracts/YQ-API-CONTRACT-1.2.0.md).
Types are generated from Service `2.2.0` and OpenAPI document `1.4.0`
(OpenAPI dialect `3.1.0`). The
[clinician-feedback plan](../../docs/plans/2026-11-16-clinician-feedback.md)
describes the added learning, birth comparison and constitution scope.

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
  type YunQiLearningDto,
  type BirthComparisonRequest,
  type BirthComparisonDto,
  type ConstitutionQuestionnaireDto,
  type ConstitutionRequest,
  type ConstitutionAssessmentDto,
} from '@yunqi/contracts';
```

Do not import generated `components` or `paths`, and do not edit generated
types by hand.

## Public contract scope

The original annual, current and specified-time DTOs remain available. New
types describe learning relations, source-linked classical passages, five
movement intervals, birth-period candidates and all nine constitution scores.
`BirthComparisonRequest` accepts a Gregorian date and optional time;
`ConstitutionRequest` requires the exact questionnaire ID, an applicable sex
and complete answers. DTOs describe the wire contract; the package does not
calculate relations, determine date boundaries or score answers.

There are eight business operations: annual/current/calculation, current and
specified-time learning, birth comparison, questionnaire retrieval and
constitution assessment. Their exact paths and migration requirements are in
the [current contract](../../docs/contracts/YQ-API-CONTRACT-1.2.0.md).
Rule provenance remains in the
[learning rules](../../rules/LEARNING_RULES_V1.md) and
[constitution rules](../../rules/CONSTITUTION-GBT46939-2025.md).

The one public time wire schema is `YunQiTimeDto`.
`YunQiCalculationInputTimeDto` and `YunQiBoundaryTimeDto` are semantic
TypeScript aliases, not duplicate OpenAPI schemas.

The canonical calculation display value is:

```ts
result.input.localTime
```

Do not add `result.calendarTime`, `timezone`, or frontend Date/IANA
reinterpretation.
Learning results expose this same time schema under `facts.input`.
Birth-comparison intervals use `from` and `until`; a candidate's internal
sampling time must not be presented as a known birth time.

## Generation and verification

From the repository root:

```text
pnpm contracts:generate
pnpm contracts:check
pnpm --filter @yunqi/contracts build
pnpm --filter @yunqi/contracts test:typecheck
```

Machine freezes are stored per registered Contract ID:

```text
contract/<Contract ID>.freeze.json
contract/registry.json
```

The registry is append-only. `contracts:freeze` cannot overwrite or recreate a
known ID with different content. Actual registration and `contracts:check`
determine the machine-freeze state; updating a README or generated types is
not a substitute for either.

The historical `YQ-API-CONTRACT-1.0.0` and `YQ-API-CONTRACT-1.1.0` freeze files
remain immutable. Their
[1.0.0](../../docs/contracts/YQ-API-CONTRACT-1.0.0.md) and
[1.1.0](../../docs/contracts/YQ-API-CONTRACT-1.1.0.md) notes are retained for
previous consumers. Engineering contract freeze does not certify clinical
validity or expert acceptance of rules.
