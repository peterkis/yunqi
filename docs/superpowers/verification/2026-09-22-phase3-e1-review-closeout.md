# E1 form and browser closeout — 2026-09-22

Base: `883c6f096cab02c2428004f49718e56afd24dc77` (PR #12).
Implementation/build commit: `4a3ddf3d67ad3ec4214608812cbcd24867937b50`.
Branch: `codex/phase3-e1-review-closeout`.

## Change and RED/GREEN

Five previously reviewed Workbench repairs were transferred into an isolated
worktree without modifying their source copies in the main worktree. Native
required validation now enters shared invalid state, clears stale results and
dirty feedback, and exposes the existing labeled error without making a request.
The input is focused after cancellation of the native validation bubble.

- RED on base production code: actual empty-button click failed because no
  accessible alert existed (1 failed, 16 skipped).
- GREEN after original repair transfer: same test passed (1 passed, 17 skipped).
- Focus RED: input focus assertion failed; submit button retained focus.
- Focus GREEN: `event.currentTarget.focus()` restores the input.
- Final focused route/form/normalizer/mapper/hook run: 5 files, 38 tests PASS.
- Test typecheck: PASS.

jsdom 29.1.1 normalizes a seconds-only datetime-local assignment to `.000`.
An attempted seconds-route test consequently rejected that changed value. The
final route test uses minutes for dirty/clear behavior, and the retained
fractional-seconds test asserts its exact DOM value before dispatching submit.
Seconds-only normalization is unit-tested directly and submitted through a real
browser below; no production input grammar was expanded to accommodate jsdom.

## Browser acceptance

The in-app browser connection failed with `privileged native pipe bridge is not
available; browser-client is not trusted`. Fallback used an independent headless
Edge `153.0.4234.48` instance on Windows, controlled by the installed Playwright
runtime. It did not attach to the user's browser profile.

Built static Workbench assets were served by a temporary external same-origin
HTTP harness forwarding API requests to the real Fastify buildApp and tyme4ts
provider over loopback. No production proxy, dependency or Service change.
Browser timezone was deliberately America/New_York in all three contexts;
business payload/display remained fixed Beijing +08:00.

| Viewport | Scenarios and layout | API requests | Unexpected Console / page errors |
|---|---|---|---|
| 1440×1000 | PASS | 5 calculate + 1 annual + 1 current | 0 / 0 |
| 737×900 | PASS | 5 calculate + 1 annual + 1 current | 0 / 0 |
| 390×844 | PASS | 5 calculate + 1 annual + 1 current | 0 / 0 |

Each run verified idle zero-request state, empty click, keyboard empty-submit
button activation, focus/aria error association, Enter inside the datetime
control, minute payload `2026-05-20T13:30:00+08:00`, seconds payload
`2026-05-21T13:30:45+08:00`, canonical result time, six noninteractive stages,
dirty hiding without request, clearing-after-success, disabled pending controls,
sanitized error, and successful retry. Current/year/inquiry/not-found request
boundaries were also exercised. All eleven document-width observations per
viewport satisfied scrollWidth <= clientWidth. Success screenshots were
visually inspected at all three widths.

One deliberately held request tested pending state; one intercepted response
returned HTTP 503 with a test-only raw-message sentinel. That sentinel never
appeared in the UI. Each run's single expected 503 Console resource error is
retained and labeled; it is not counted as a normal-success console error.
Normal calculate successes and retry used real Service responses, not fixtures.

The first browser attempt stopped on a test-harness locator mismatch: annual
heading is `年度五运六气分析`, not the navigation label `年度分析`. After correcting
the harness, all three complete runs passed. No product change was needed.

Evidence: [request/response, Console, dimensions and build identity JSON](evidence/2026-09-22-e1/browser-results.json).
The final runner first verifies a clean source tree, runs `pnpm build`, and
records its SHA-bound successful [build log](evidence/2026-09-22-e1/build.log).
The JSON includes SHA-256 hashes of Workbench, Domain, adapter and Service
build files and the external runner before browser execution.
The external runner is retained locally at `D:/Projects/yunqi-e1-browser-check.cjs`;
it is not a production file or portable repository test command.
Screenshots are `{1440,737,390}-{invalid,success,error}.png` in that directory.
These are synthetic engineering time inputs, not expert reference values or
clinical feedback. The harness closed browser, proxy and Service on completion.

## Repository gates and review

Completed gates: frozen install, typecheck, coverage, contracts:check,
schema:validate (4 tests), openapi:validate, and diff check PASS.
Coverage: Domain statements 96.15% / branches 90.98%; Client 100% / 100%;
Service 97.43% / 88.70%; Workbench 98.84% / 92.95%, functions 100%.
Final `pnpm test`: PASS (exit 0), including 110 Workbench tests, 245 Workbench
governance tests, 12 Contract governance tests, 8 time-governance tests,
Domain 132, adapter 37, Client 8, Service 136, timezone and smoke checks.
The first aggregate
`pnpm test` passed all package tests (including 110 Workbench tests), governance,
timezone and production smoke checks, then Windows Node 24.18.0 aborted during
Redocly shutdown with `UV_HANDLE_CLOSING` (exit 3221226505). This run is FAIL,
not an aggregate pass. The isolated openapi:lint/check retry passed without code
changes; the three existing OpenAPI warnings remain unchanged.

Independent Spec review: Ohm, no actionable code/spec finding; focused tests
independently run. Independent Standards review: McClintock, no hard violation
or actionable smell. Both required browser evidence to establish real-control
seconds payload and keyboard behavior; the runs above provide it.

All packages, OpenAPI/Contract, manifests and lockfile remain zero diff relative
to base. Public API and YQ-API-CONTRACT-1.0.0 are unchanged. G1–G6 remain NOT_RUN;
E3/E4 still require real expert/reference and session evidence.
