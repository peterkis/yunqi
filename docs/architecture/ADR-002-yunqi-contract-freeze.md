# ADR-002: YunQi API Contract Freeze and Client Package Boundary

- Status: Accepted
- Date: 2026-07-17
- Scope: YunQi Service OpenAPI, browser contracts, typed client, Phase3
  consumers, and CI governance
- Contract record: `docs/contracts/YQ-API-CONTRACT-1.0.0.md`
- Migration plan: `docs/plans/2026-07-Phase3-A-contract-migration.md`

## Context

Phase2 exposed browser DTOs and a typed client through
`@yunqi/service/contracts`. That path couples future React consumers to a
package whose ownership and dependency graph are Fastify and Node oriented.
It also leaves the public YunQi response shape governed only by generated-file
drift rather than an explicit business contract identity.

Before Phase3, the API response shape, fixed-Beijing time DTO, generation
chain, package ownership, and CI enforcement must be stable enough that the
React workbench cannot create a second DTO model or silently consume a
changed wire contract.

## Decision

Create two browser-safe packages:

```text
@yunqi/contracts 1.0.0
@yunqi/client    1.0.0
```

The dependency and generation direction is:

```text
@yunqi/service TypeBox schemas
  -> OpenAPI YAML
  -> @yunqi/contracts internal generated types
  -> @yunqi/contracts public facade
  -> @yunqi/client
  -> Phase3 React
```

Reverse dependencies are forbidden:

- Service must not depend on contracts or client;
- contracts must not depend on Service runtime, Domain, Fastify, React,
  Axios, or TanStack Query;
- client must not depend on Service, Domain, React, Axios, or TanStack Query;
- React must not declare a parallel YunQi DTO model.

The old `@yunqi/service/contracts` entry is removed without a runtime or type
compatibility re-export. Because this is a package-level breaking change,
`@yunqi/service` moves to `2.0.0`.

## Contract identity and version meanings

The following versions describe separate compatibility boundaries:

| Item | Frozen value | Meaning |
|---|---|---|
| API path | `/api/v1` | communication compatibility boundary |
| OpenAPI dialect | `3.1.0` | OpenAPI language version |
| OpenAPI document | `1.2.0` | document lifecycle version |
| Contract ID | `YQ-API-CONTRACT-1.0.0` | exact YunQi business wire freeze |
| Rule version | `YQ-MVP-RULES-1.0.0` | deterministic Domain rule set |

OpenAPI document version `1.2.0` is not API path v1.2 and is not the rule
version.

The OpenAPI root carries:

```yaml
x-yunqi-contract-id: YQ-API-CONTRACT-1.0.0
```

## Public time schema

OpenAPI contains exactly one public time component:

```ts
interface YunQiTimeDto {
  readonly localTime: string;
  readonly epochMilliseconds: number;
  readonly offset: '+08:00';
  readonly calendarTimeStandard: 'BeijingStandardTime+08:00';
}
```

The TypeScript facade provides semantic aliases only:

```ts
type YunQiCalculationInputTimeDto = YunQiTimeDto;
type YunQiBoundaryTimeDto = YunQiTimeDto;
```

These aliases do not create duplicate OpenAPI schemas. Public contracts do
not expose the Domain type name `YunQiCalendarTime`.

`YunQiCalculationDto.input` remains the wire field for the canonical fixed
Beijing input used by the calculation. Phase3 renders
`result.input.localTime`; no `result.calendarTime` field is introduced.

ADR-001 continues to govern all time meaning. The package split does not
authorize Date, Temporal, Intl, IANA, browser-local, or DST reinterpretation.

## Exact freeze boundary

`YQ-API-CONTRACT-1.0.0` freezes the three business endpoints:

```text
GET  /api/v1/yunqi/year/{year}
GET  /api/v1/yunqi/current
POST /api/v1/yunqi/calculate
```

The canonical freeze projection includes:

- OpenAPI dialect, document version, and Contract ID;
- path, method, operationId, parameters, and request bodies;
- every response status and schema reference;
- all schemas reachable from those operations;
- public schema names, types, formats, enums, constants, required fields,
  validation constraints, item constraints, and `additionalProperties`.

JSON property order, descriptions, examples, server URLs, tags, and `/health`
are outside this business Contract ID. They remain governed by the full
OpenAPI generation-drift and validation gates.

Any freeze-projection change requires a new Contract ID. Updating the baseline
under an unchanged ID is rejected.

The append-only registry:

```text
packages/yunqi-contracts/contract/registry.json
```

records every allocated Contract ID. A registered ID whose baseline is
missing is an error, and an existing baseline whose embedded ID or content
differs is immutable. New baselines may be created only for an unregistered
ID. CI checks the registry across the repository's full Git history: an ID
that appeared in any historical registry revision may never be removed.
Every registered ID must retain a matching `*.freeze.json`, and an
unregistered freeze file is rejected. The workflow therefore checks out full
history (`fetch-depth: 0`); a shallow clone is not sufficient for this gate.
For every baseline that already exists in Git history, the checked-in file
must also match its first registered canonical content. Contract ID rotation
therefore cannot make an older baseline mutable.

## Generated and curated boundaries

Generated OpenAPI TypeScript remains internal to `@yunqi/contracts`.
Consumers do not import generated `components` or `paths`.

The facade derives every DTO from generated types. It may apply semantic
aliases and TypeScript-only refinements such as the readonly six-element
`SixQiDto.steps` tuple, but it must not handwrite a second structural DTO
source.

`@yunqi/client` owns Fetch transport, an Axios structural adapter,
`YunQiApiError`, `createYunQiClient`, the default client, and query-option
objects. Structural integration avoids runtime dependencies on Axios or
TanStack Query.

## CI enforcement

The repository workflow exposes one required job named `quality-gates`. It
runs, in order:

```text
pnpm install --frozen-lockfile
pnpm test:time-governance
pnpm contracts:check
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
```

The workflow runs for pull requests and pushes to `main`, has
`contents: read`, and cancels obsolete runs for the same ref.

GitHub ruleset or branch protection must require `quality-gates`, reject
merges while it is failing or pending, and prevent bypassing the rule through
direct pushes. A checked-in workflow alone is not evidence that repository
protection is active.

## Consequences

Positive consequences:

- Phase3 has one DTO ownership boundary;
- React can depend on browser-only packages without Fastify ownership;
- wire-shape changes become explicit, versioned decisions;
- fixed-Beijing time semantics remain visible in the public facade; and
- CI detects schema, generated-type, dependency, and freeze drift.

Compatibility consequences:

- imports from `@yunqi/service/contracts` stop compiling;
- consumers must move DTO imports to `@yunqi/contracts` and client imports to
  `@yunqi/client`;
- OpenAPI component `YunQiCalendarTimeDto` becomes `YunQiTimeDto`; and
- JSON fields, endpoint paths, statuses, and Domain rules remain unchanged.

## Rejected alternatives

### Keep `@yunqi/service/contracts`

Rejected because public browser ownership remains coupled to the server
package and encourages Phase3 to depend on Fastify-oriented package metadata.

### One combined contracts/client package

Rejected because pure generated DTOs and runtime transport code have different
dependency and release responsibilities.

### Duplicate semantic time schemas in OpenAPI

Rejected because structurally identical `input` and boundary components can
drift. One `YunQiTimeDto` plus TypeScript aliases preserves meaning without
duplicating the wire schema.

### Snapshot-only OpenAPI governance

Rejected because a snapshot can be overwritten under the same identity.
Contract ID rotation is required whenever the exact business projection
changes.
