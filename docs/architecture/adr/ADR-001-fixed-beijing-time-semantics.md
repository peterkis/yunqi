# ADR-001: Fixed Beijing Standard Time Semantics

- Status: Accepted
- Date: 2026-07-16
- Scope: YunQi Domain, calendar adapters, Service API contracts, persistence
  guidance, and frontend time display
- Detailed implementation specification:
  `docs/superpowers/specs/2026-07-16-yunqi-calendar-time-semantics-design.md`

## Context

The system previously used the label `Asia/Shanghai` for two incompatible
meanings:

1. Domain and the tyme4ts adapter used fixed UTC+08:00 arithmetic.
2. Service local-input parsing used the IANA `Asia/Shanghai` time-zone history,
   including daylight-saving transitions from 1986 through 1991.

This difference can change six-step ownership at real historical solar-term
boundaries. A suffix-free 1991 local time can be interpreted one hour earlier
than the same written time with `+08:00`.

YunQi calculation requires one continuous, deterministic calendar meaning.
Historical civil-government DST is not part of the intended traditional
calendar interpretation.

## Decision

All YunQi business-time interpretation uses fixed Beijing Standard Time:

```text
UTC offset: +08:00
Calendar standard: BeijingStandardTime+08:00
DST: never applied
IANA time-zone rules: not used
Server local time zone: not used
```

Historical DST from 1986 through 1991 does not participate in YunQi
calculation.

## Authoritative model

`YunQiCalendarTime` is the authoritative dated-calculation model:

```ts
interface YunQiInstant {
  readonly epochMilliseconds: number;
  readonly offset: '+08:00';
}

interface BeijingLocalDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

interface YunQiCalendarTime {
  readonly localDateTime: BeijingLocalDateTime;
  readonly calendarTimeStandard:
    'BeijingStandardTime+08:00';
  readonly instant: YunQiInstant;
}
```

`YunQiInstant` is not a civil timezone instant and is not a civil time-zone
model. Its `epochMilliseconds` is the fixed Beijing model's absolute
representation for:

- ordering;
- transport;
- persistence;
- audit;
- compatibility; and
- consistency validation.

It is not the authoritative calendar comparison source and must not be
reinterpreted through UTC, IANA rules, server-local time, or DST to make YunQi
boundary decisions.

## Calculation decision

The only internal dated-calculation implementation is:

```ts
calculateYunQiByCalendarTime()
```

The existing:

```ts
calculateYunQi(YunQiInstant)
```

is a compatibility adapter with the required flow:

```text
YunQiInstant
  -> YunQiCalendarTime
  -> calculateYunQiByCalendarTime()
```

It contains no independent year or six-step boundary algorithm.

## CalendarProvider boundary

The provider contract remains:

```ts
interface CalendarProvider {
  getSolarTermInstant(
    year: number,
    term: SolarTerm,
  ): YunQiInstant;
}
```

The responsibilities are separated:

```text
tyme4ts
  -> astronomical solar-term calculation

Tyme4tsAdapter
  -> fixed UTC+08:00 representation

yunqi-domain
  -> YunQi year, six-step ownership, interval semantics, and rules
```

CalendarProvider must not decide:

- YunQi year;
- six-step ownership;
- left-closed/right-open behavior;
- boundary ownership; or
- five-movement, six-qi, and host/guest rules.

## Service normalization boundary

The Business Time Normalizer is located at:

```text
packages/yunqi-service/src/modules/time-normalizer
```

It alone parses and normalizes API time input and formats API time output.
Controllers, routes, mappers, DTO code, and serializers must not construct
`Date` objects, call `Date.parse()`, use `toISOString()`, use Temporal/Intl, or
apply IANA rules for YunQi business time.

Supported inputs are limited to:

```text
YYYY-MM-DDTHH:mm:ss
YYYY-MM-DDTHH:mm:ss.SSS
YYYY-MM-DDTHH:mm:ss+08:00
YYYY-MM-DDTHH:mm:ss.SSS+08:00
YYYY-MM-DDTHH:mm:ssZ
YYYY-MM-DDTHH:mm:ss.SSSZ
```

Other offsets and alternate syntax are rejected. Representative forbidden
inputs include:

```text
2026-01-01T12:00:00+0800
2026-01-01 12:00:00
2026/01/01 12:00:00
```

The parser must not broaden the contract to basic ISO offsets,
space-separated date-time, slash-separated dates, or locale formats.

## Runtime clock

The runtime clock may supply epoch milliseconds only:

```text
runtime clock
  -> epochMilliseconds
  -> YunQiInstant
  -> YunQiCalendarTime
  -> calculateYunQiByCalendarTime()
```

`Date.now` or an injected equivalent is allowed as the epoch source. No runtime
time-zone fields or DST behavior participate.

## API decision

API paths remain `/api/v1`. Public time values use:

```json
{
  "localTime": "2026-06-19T12:00:00+08:00",
  "epochMilliseconds": 1781841600000,
  "offset": "+08:00",
  "calendarTimeStandard": "BeijingStandardTime+08:00"
}
```

The old `timezone: "Asia/Shanghai"` property is removed.

Version meanings remain separate:

```text
OpenAPI dialect: 3.1.0
OpenAPI document release: 1.1.0
API path version: /api/v1
Rule version: YQ-MVP-RULES-1.0.0
```

## One-way migration

Allowed:

```text
legacy API input
  -> Business Time Normalizer
  -> YunQiCalendarTime
  -> authoritative Domain calculation
```

Forbidden:

```text
new Domain model
  -> IANA/DST compatibility behavior
  -> retired time semantics
```

The compatibility instant entry does not authorize a second instant-only
calculation implementation.

## Validation and reproducibility

Domain factory validation is always enabled. The optional use of
`assertYunQiCalendarTime()` adds redundant deep diagnostic validation; it
never changes the calculation policy.

Domain source, tests, and fixtures do not depend on `Date`, Temporal, Intl,
IANA identifiers, or a time-zone database.

The same business input must produce identical CalendarTime and YunQi results
when the process is launched with different default time zones, including
`TZ=UTC` and `TZ=Asia/Shanghai`.

## Consequences

Positive consequences:

- historical DST cannot shift YunQi boundary ownership;
- calculation is reproducible across hosts and tzdb/ICU versions;
- local calendar meaning and absolute transport representation are explicit;
- tyme4ts remains replaceable behind the adapter boundary; and
- one authoritative calculation implementation prevents semantic drift.

Compatibility consequences:

- the `/calculate` request property and `/api/v1` paths remain unchanged;
- public response time DTOs change and require regenerated OpenAPI/browser
  contracts;
- the direct Domain instant entry remains as a compatibility wrapper; and
- suffix-free historical dates previously rejected or shifted by IANA DST are
  interpreted as ordinary fixed UTC+08:00 dates.

## Rejected alternatives

### Historical IANA `Asia/Shanghai`

Rejected because it changes 1986-1991 interpretations, depends on host
tzdb/ICU data, and conflicts with Phase 1 and tyme4ts fixed UTC+08:00 results.

### Instant-only Domain calculation

Rejected because it erases the authoritative local calendar meaning and allows
UTC/IANA reinterpretation to become the business rule.

### CalendarProvider deciding YunQi boundaries

Rejected because it mixes external calendar calculation with Domain rules and
makes adapters responsible for YunQi-year and six-step semantics.
