# Phase3-A API Contract Freeze and Client Package Migration

- Status: Approved for implementation
- Date: 2026-07-17
- Contract ID: `YQ-API-CONTRACT-1.0.0`
- ADR: `docs/architecture/ADR-002-yunqi-contract-freeze.md`

## Goal

Prepare the repository for the Phase3 React workbench by giving DTOs and the
typed browser client independent package ownership, freezing the three YunQi
business API operations, and making the freeze a required CI gate.

## Fixed versions

| Item | Version |
|---|---|
| API path | `/api/v1` |
| OpenAPI dialect | `3.1.0` |
| OpenAPI document | `1.2.0` |
| Contract ID | `YQ-API-CONTRACT-1.0.0` |
| Rule version | `YQ-MVP-RULES-1.0.0` |
| `@yunqi/contracts` | `1.0.0` |
| `@yunqi/client` | `1.0.0` |
| `@yunqi/service` | `2.0.0` |

## Implementation sequence

1. Record ADR-002, the frozen contract, this migration plan, and AGENTS
   governance.
2. Add failing OpenAPI tests for document version `1.2.0`, root Contract ID,
   `YunQiTimeDto`, removal of `YunQiCalendarTimeDto`, and preservation of the
   `input` wire field.
3. Update the TypeBox schema and generate the OpenAPI YAML.
4. Create `packages/yunqi-contracts`, generate its internal OpenAPI types, and
   expose a curated public facade derived from those types.
5. Add positive and negative type tests for readonly DTOs, semantic time
   aliases, the six-step tuple, missing/extra fields, and forbidden public
   names.
6. Create `packages/yunqi-client`, migrate the Fetch and Axios-structural
   transports, error model, client, default instance, query options, and
   tests.
7. Remove `@yunqi/service/contracts` completely and update documentation.
8. Add the normalized business-contract projection, immutable baseline, drift
   checker, explicit freeze command, mutation tests, and package-dependency
   guard.
9. Add `.github/workflows/ci.yml` with a fixed `quality-gates` job and a
   static repository test for all required steps.
10. Run the complete acceptance matrix, inspect the resulting diff, record
    verification, and attempt to require `quality-gates` through GitHub
    repository protection.

## Package boundaries

```text
@yunqi/service
  TypeBox + Fastify runtime schema source
        |
        v
OpenAPI YAML
        |
        v
@yunqi/contracts
  internal generated types + curated facade
        |
        v
@yunqi/client
  browser-safe transport/client
        |
        v
Phase3 React
```

Forbidden imports:

- Service -> contracts/client;
- contracts -> Service/Domain/Fastify/React/Axios/TanStack Query;
- client -> Service/Domain/Fastify/React/Axios/TanStack Query;
- React -> handwritten or duplicated YunQi DTOs.

## TDD checkpoints

The implementation must observe RED before production changes for:

- OpenAPI metadata and time component rename;
- contracts public facade and negative type behavior;
- client runtime behavior;
- freeze projection drift detection;
- dependency-direction detection; and
- CI workflow contents.

Generated files and workflow YAML are treated as generated/configuration
exceptions, but their behavior is covered by the failing tests above.

## Freeze behavior

`contracts:generate` writes:

- `packages/yunqi-service/openapi/yunqi-service.openapi.yaml`;
- `packages/yunqi-contracts/src/generated/openapi.ts`.

`contracts:check` regenerates into a temporary directory and compares:

- checked-in OpenAPI YAML;
- checked-in internal generated types;
- the normalized
  `packages/yunqi-contracts/contract/YQ-API-CONTRACT-1.0.0.freeze.json`.

`contracts:freeze` may create a baseline only for a new Contract ID. It must
fail if the existing baseline differs while the document still declares the
same ID. `packages/yunqi-contracts/contract/registry.json` records allocated
IDs so a known baseline cannot be deleted and silently recreated. The check
uses full Git history to enforce that the registry is append-only and verifies
every registered baseline, not only the current document ID. CI must therefore
checkout with `fetch-depth: 0`. Once a baseline appears in Git history, its
canonical content is compared with its first registered revision so later
Contract ID rotations cannot make it mutable.

The business freeze covers the three `/api/v1/yunqi/**` paths and reachable
schemas. `/health`, descriptions, examples, servers, tags, and property order
remain outside the Contract ID but inside full OpenAPI drift validation.

## CI and repository protection

The workflow:

- triggers for pull requests and pushes to `main`;
- uses Node 22 and pnpm 10.32.1 from the root package metadata;
- exposes the fixed job name `quality-gates`;
- has `contents: read` and per-ref concurrency cancellation;
- runs the approved seven commands in order.

After the workflow exists on GitHub, repository rules must require
`quality-gates` for `main`, block failing/pending merges, and prevent direct
push bypass. If repository permissions do not permit this, the final record
must state that workflow creation is complete but branch protection is not
confirmed.

## Acceptance commands

Run independently:

```text
pnpm install --frozen-lockfile
pnpm contracts:check
pnpm test:time-governance
pnpm test:time-purity
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
pnpm openapi:validate
git diff --check
```

Also confirm:

- Phase1 Domain and tyme4ts epochs are unchanged;
- API JSON fields and behavior are unchanged except for the OpenAPI component
  name;
- `/api/v1` and `YQ-MVP-RULES-1.0.0` are unchanged;
- `@yunqi/service/contracts` has no manifest export, source, test, generated
  artifact, or README entry;
- no React application, database table, or consultation feature was added;
- the three known Redocly warnings remain the only warnings.

## Verification record

Final evidence is saved at:

```text
docs/superpowers/verification/2026-07-17-phase3-a-contract-freeze.md
```
