# Phase3-C4 Inquiry Entry Design

**Status:** Approved, implementation-ready  
**Date:** 2026-07-22  
**Application:** `apps/yunqi-workbench`

## 1. Purpose

Phase3-C4 enables one real Workbench route, `/yunqi/inquiry`, as a safe
entry point for future structured-inquiry capabilities. The route is a
product entry, not an inquiry workflow. It displays three planned capability
cards and creates no patient, inquiry, observation, permission, or audit
records.

```text
/yunqi/inquiry
  -> InquiryEntryPage
  -> three non-interactive planned capability cards
```

The page makes no request and has no Query Hook, Client call, DTO, form,
mock, browser storage, or persistence behavior.

## 2. Scope and non-goals

Included:

- an enabled `问诊` navigation link;
- the exact `/yunqi/inquiry` route;
- a read-only entry page;
- five minimal Workbench-internal Context Models;
- path-scoped governance and mutation tests; and
- documentation and verification evidence.

Not included:

- patient search or selection;
- inquiry creation or lifecycle;
- observation input forms;
- record or audit persistence;
- permission enforcement or role definitions;
- AI analysis or YunQi correlation;
- inquiry child routes;
- Patient, Inquiry, or Observation APIs;
- Query Hooks, runtime mock data, localStorage, or a database.

## 3. Route and navigation contract

The approved route table is:

```text
/yunqi/current       -> existing current view
/yunqi/year          -> existing annual entry
/yunqi/year/:year    -> existing annual analysis
/yunqi/inquiry       -> InquiryEntryPage
```

The inquiry navigation item is enabled, links exactly to
`/yunqi/inquiry`, and uses exact matching. Enabled means only that the entry
page is reachable; it does not mean inquiry business capabilities are live.

The following paths are not approved and continue to render NotFound:

```text
/yunqi/inquiry/patient
/yunqi/inquiry/history
/yunqi/inquiry/new
```

No YunQi Client method may be called for the entry route or these rejected
child paths.

## 4. Internal Context Models

The models live only in `features/inquiry/models`:

```ts
export interface PatientContextModel {
  readonly id: string;
  readonly displayName?: string;
}

export interface InquiryContextModel {
  readonly id: string;
  readonly patientId: string;
}

export interface ObservationContextModel {
  readonly id: string;
  readonly inquiryId: string;
  readonly category?: string;
  readonly recordedValue?: unknown;
}

export interface PermissionContextModel {
  readonly actorId: string;
}

export interface AuditContextModel {
  readonly actorId: string;
  readonly action: string;
  readonly timestamp: string;
  readonly targetId?: string;
}
```

These are Workbench-internal future capability boundaries. They are not DTOs,
entities, API models, OpenAPI schemas, or server facts. Only
`features/inquiry/models/index.ts` may re-export them, using `export type`.
There is no feature-root barrel. Production pages and components do not import
or instantiate the models in this phase.

Open dictionaries, role enums, lifecycle fields, clinical categories, and
medical inference fields are forbidden. Observation stores only a neutral
fact payload. Actor and operation time belong only to Audit.

## 5. Page design

```text
InquiryEntryPage
  -> page header and boundary statement
  -> Future Capabilities Panel
      -> Patient Context card
      -> History card
      -> Structured Record card
```

Every capability uses the existing `Card` and neutral `Badge`. A card is an
`article` with an `h3`, description, and visible `状态 / 规划中` text. It is
not a button, link, disabled control, or click target.

The approved copy is:

- heading: `问诊结构化入口`;
- boundary: `为未来患者上下文、历史记录和结构化记录能力建立安全入口。本阶段不创建、保存或分析患者记录。`;
- panel title: `未来能力`;
- panel description: `以下能力仅展示规划边界，尚未开放操作。`;
- patient: `为未来患者引用与展示信息预留位置。`;
- history: `为未来经授权的数据查看与教学复盘预留入口。`;
- structured record: `为未来经确认的专业流程预留入口。`; and
- badge: `规划中`.

Desktop uses three equal columns. Tablet may wrap responsively. Mobile uses
one column. Existing paper, ink, and cinnabar tokens remain; no new animation,
gradient, chart, alert color, or UI dependency is introduced.

## 6. Governance

Feature `pages/**` files are component-responsibility files and receive the
same DTO, Client, fetch, direct method, and API path prohibitions as existing
components.

AST governance enforces the exact Context interfaces, readonly and optional
members, type-only internal exports, the absence of a feature-root model
barrel, and the absence of model imports in production inquiry pages and
components.

Medical-decision words are checked only where users can see them: JSX text,
statically evaluable JSX expressions, and visible JSX attributes such as
`label`, `title`, `aria-label`, `placeholder`, `alt`, and `description`.
Ordinary variable names, comments, tests, fixtures, documentation, and the
global safety boundary statement are outside this check.

## 7. Future evaluation path

The following is guidance for later evaluation, not a frozen C4 capability:

```text
expert workflow validation
  -> Inquiry Service
  -> OpenAPI schema
  -> @yunqi/contracts
  -> @yunqi/client
  -> React
```

HIS/EMR patient data must enter through a formal API and generated Contract,
never through an open `metadata` dictionary. Observation categories wait for
expert validation. Identity, roles, and RBAC wait for real authentication,
organization, and permission designs. Internal Context Models must not be
promoted directly into public DTOs.

## 8. Acceptance

Completion requires route, navigation, zero-request, NotFound, semantic card,
type-boundary, governance mutation, responsive, accessibility, coverage,
build, full workspace, Contract drift, time governance, Schema/OpenAPI, and
browser verification. Domain, adapter, Service, Contracts, Client, OpenAPI,
package manifests, and the lockfile remain unchanged.
