# Phase3-C3 Annual Analysis State Matrix

**Status:** Approved baseline  
**Date:** 2026-07-21  
**Related design:**
`docs/superpowers/specs/2026-07-21-phase3-c3-annual-analysis-design.md`

## Route state matrix

| Route | Validation | Page state | Annual query | Expected presentation |
|---|---|---|---|---|
| `/` | not applicable | redirect | no | Replace with `/yunqi/current` |
| `/yunqi/current` | not applicable | current view | `/current` only | Existing C1/C2 current-state view |
| `/yunqi/year` | no year supplied | entry | no | Year selector plus explicit selection prompt |
| `/yunqi/year/abc` | format error | invalid | no | Four-digit-year validation message |
| `/yunqi/year/2026abc` | format error | invalid | no | Four-digit-year validation message |
| `/yunqi/year/1900` | range error | invalid | no | Inclusive `1901–2099` range message |
| `/yunqi/year/2100` | range error | invalid | no | Inclusive `1901–2099` range message |
| `/yunqi/year/2026` | valid | pending | `/year/2026` | Year-specific loading state |
| `/yunqi/year/2026` | valid | success | `/year/2026` | Annual summary and master-detail view |
| `/yunqi/year/2026` | valid | API error | `/year/2026` | Sanitized error and retry action |
| `/yunqi/year/2026` | valid | empty | `/year/2026` | Neutral year-specific empty state |
| unknown path | not applicable | not found | no | Workbench not-found page |

## State ownership

| State | Owner | Persistence | Explicit non-owner |
|---|---|---|---|
| Active page | Router | URL/history | component-local state |
| Analysis year | Router parameter | URL/history | React state, `/current`, browser clock |
| Query result/status | TanStack Query | query cache keyed by year | Router, components |
| Selected Six-Qi stage | `AnnualYunQiPage` | component lifetime only | URL/query string, Contract, server |
| YunQi facts | frozen API Contract | response DTO | Router, Mapper inference, components |
| Display labels | pure presentation mapper | derived per DTO | Domain or API mutation |

## Year transition matrix

| Event | URL result | Query behavior | Stage selection |
|---|---|---|---|
| Enter annual index | `/yunqi/year` | no query | not created |
| Select 2026 | `/yunqi/year/2026` | request 2026 | first returned stage selected |
| Select 2027 | `/yunqi/year/2027` | request 2027 without 2026 placeholder | reset to first returned stage |
| Browser Back | previous annual URL | query according to restored URL | reset for restored result |
| Load invalid URL | unchanged invalid URL | no query | not created |
| Repair invalid URL through Select | selected valid annual URL | request selected year | first returned stage selected |

## Forbidden transitions

```text
/yunqi/year
  -X-> browser Date -> inferred year -> annual query

invalid year
  -X-> API request

/year/:year result
  -X-> current/completed/upcoming stage derivation

selected stage
  -X-> URL query parameter

year navigation
  -X-> previous-year placeholder facts
```
