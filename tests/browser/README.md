# Browser acceptance

This suite checks the approved read-only Workbench with a real local Service,
the real calendar adapter, and Vite's same-origin proxy. It covers workflow
completion and visible UI behavior. It does not establish expert rule approval,
clinical validation, production hosting readiness, or a complete WCAG audit.

## Run

Use Node.js 22.12 or newer and the repository's pnpm version.

```text
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:browser
```

On Linux, install browser system dependencies with
`pnpm exec playwright install --with-deps chromium`.

Focused commands also build the current sources first:

```text
pnpm test:browser:flows
pnpm test:browser:visual
```

After a successful build, use the runner directly for a focused iteration:

```text
pnpm exec playwright test --project=tablet-light --grep annual-result
```

The default browser is the Chromium revision bundled with the pinned
Playwright version. A local machine can also run its installed Edge or Chrome
in an isolated temporary browser profile. For example, in PowerShell:

```powershell
$env:YUNQI_BROWSER_CHANNEL = 'msedge'
pnpm test:browser
Remove-Item Env:YUNQI_BROWSER_CHANNEL
```

The optional channel accepts only `msedge` or `chrome`. The environment record
names the channel used; an Edge run is not reported as bundled Chromium.

When the pinned browser download is unavailable, an installed browser can be
selected explicitly with `YUNQI_BROWSER_EXECUTABLE=/absolute/path/to/chromium`.
Do not combine this with a channel. The evidence records the executable and
each test records the actual browser version; report the failed download and
the installed-browser run separately. CI keeps its default bundled Chromium.

## Owned environment

- Service and the frontend HTTP server each bind `127.0.0.1` on an OS-assigned
  port. The suite never reuses or stops an existing development service.
- Vite runs as middleware behind the owned HTTP listener. Vite's own `port: 0`
  resolves to a default port, so it cannot provide this isolation guarantee.
- The Vite dependency cache is unique to the run. Ambient API-origin overrides
  are disabled for this test environment.
- HMR is disabled, and `server.ws.server` binds Vite's WebSocket transport to
  the same owned HTTP listener. In Vite 8, `server.hmr: false` alone still
  permits a listener on the default WebSocket port. Disabling the transport
  while the pinned Vite 8.1.5 dev client is injected produced a runtime error;
  sharing the ephemeral listener preserves the client without using that port.
- The Service receives the fixed system-clock epoch `1705759642000`, whose API
  canonical input is `2024-01-20T22:07:22+08:00`. Test code does not calculate
  domain results or invent a second rule oracle.
- The browser uses `America/New_York`; assertions verify the API's canonical
  Beijing time is displayed without browser-zone reinterpretation.
- Teardown closes owned listeners and Vite and records `cleanupPassed`.
- Success paths use real HTTP responses. Three outage/retry cases inject one
  synthetic `503` response; a pending case delays one real request. These are
  explicit transport fault tests, not service reliability measurements.
- The same-page birth assessment regression also delays delivery of one real
  scoring response while birth inputs create a new session. It verifies that
  the older response cannot restore discarded answers or results.

## Coverage

| Area | Assertions |
| --- | --- |
| Current | Root redirect, canonical time, current navigation, six disclosure controls with Enter/Space, rail navigation, return path |
| Annual | Empty entry sends no query; 2024 real response; all six radio selections and keyboard movement; API boundary display; URL/navigation agreement; year change; back/forward; refresh; 1900/2100 supported years with real responses |
| Upgraded rule trace | A real 2025 `GUEST_GENERATES_HOST` stage keeps direction `客生主`, displays API traditional description `客生主，相得`, and identifies `YQ-MVP-RULES-1.1.0` plus `YQ-API-CONTRACT-1.2.0`; both annual range endpoints also verify these version identifiers |
| Invalid year | Malformed years and unsupported 1899/2101 URL years send no business request; selecting a valid year recovers |
| Specified time | No query on entry; required input; one explicit POST; minute/second normalization; dirty-result hiding; resubmit; pending disabled controls and duplicate activation; sanitized error/retry; real unsupported-year rejection then recovery |
| Learning | Current annual/period focus, folded annual timeline, keyboard relationship sources and original excerpts |
| Birth comparison | Requested date/time precision, all returned boundary candidates, canonical current snapshot, symmetric birth/current annual and period readings, edited-result hiding and clearing |
| Constitution | No partial scoring, bounded five-group navigation, 26 applicable answers, nine result dimensions, sex-change clearing, current context |
| Same-page assessment | Explicit lazy opening, one questionnaire, no nested forms or independent current query, birth-response snapshot, real scoring, end/reopen/reset, stale scoring response isolation, keyboard focus |
| Inquiry | Three planning cards, no controls or business requests, forbidden child routes show not-found, return to current |
| Runtime | No unhandled page errors or unexpected console errors; injected HTTP errors allowed only for the matching endpoint and status |
| UI | Full-page screenshots; horizontal overflow; control content fitting; year selector target height; stage-name/time line counts; desktop title line count; automated WCAG A/AA checks including contrast |

Twelve visible states are scanned: current, annual entry/result, specified-time
entry/result, inquiry, birth entry/result/assessment, constitution entry/questions
and not-found. Each runs in the following Chromium
viewport/theme projects:

| Project | Viewport | Theme |
| --- | --- | --- |
| desktop-light | 1440 × 1000 | Light |
| breakpoint-light | 1025 × 900 | Light |
| tablet-boundary-light | 768 × 900 | Light |
| tablet-light | 737 × 900 | Light |
| mobile-light | 390 × 844 | Light |
| narrow-light | 320 × 800 | Light |
| desktop-dark | 1440 × 1000 | Dark |
| mobile-dark | 390 × 844 | Dark |

This is 22 workflow tests plus 96 visual/accessibility tests (118 total). The three UX
walkthrough regressions cover the current-year shortcut and bounded adjacent-year
navigation, compact mobile stage selection with canonical time descriptions, and
sticky navigation/skip-link/technical-disclosure keyboard recovery. Narrow viewport
emulation does not establish physical device, touch, screen-reader, Firefox or
WebKit compatibility. Screenshots are evidence for human inspection; there is
no approved pixel baseline and no claim of pixel-perfect regression coverage.

The viewport matrix, UX walkthrough regressions and screenshots above exercise
the pre-refactor demo UI. Since the 2026-11-17 UI refactor they are not a
design reference; visual and walkthrough specs must be rewritten against
[docs/design](../../docs/design/README.md) (400px side panel, collapsed pill)
as the refactor lands.

## UI refactor migration

Every test run already rejects requests that leave the owned origin
(`externalRequests` in `browser-diagnostics`): fonts, icons, styles and scripts
must ship with the app because hospital networks have no internet access.

Kept unchanged through the refactor: the owned real Service and Vite
environment, the `America/New_York` browser zone, same-origin business requests,
no runtime or unexpected console errors, axe WCAG 2.1 A/AA scans, horizontal
overflow and control-fit checks, and per-run evidence under `.artifacts/browser/`.

Replaced as each refactored view lands, in the same change as its UI code so
`pnpm test:browser` stays green:

| Area | Demo-era coverage | Refactor target from the design system |
| --- | --- | --- |
| Visual projects | 320–1440 px responsive matrix | Panel 400 × 860 light and dark; panel 400 × 640 (minimum height, content scrolls, header and footer fixed); collapsed pill 400 × 64; workstation 1366 × 900 with the docked panel |
| Visual states | Demo routes and headings | The seven prototype boards: current default, original text drill-down, birth comparison, questionnaire in progress, constitution result, collapsed pill, workstation placement |
| Layout assertions | Demo class names (`.annual-six-qi-selector`, `.current-yunqi-hero`, six questions per group) | Annual and current cards visible without scrolling at height ≥ 900; icon buttons ≥ 32 × 32; options and primary buttons ≥ 40 high; visible 2 px focus ring; no horizontal scroll at 400 px |
| Flows | Demo navigation and forms | Three-segment navigation with `aria-current`, drill-down and back, one question per screen with keys 1–5 and previous question, answer destruction on edit/clear/end |

Rows stay demo-era until their view is rewritten. Elements beyond the current
authorization (HIS patient data, copying to the medical record, host docking)
are not tested until they are approved.

## Evidence and CI

Each run prints a unique directory under `.artifacts/browser/`. Subsequent
runs do not overwrite earlier failures. It contains:

- `environment.json`: local endpoints, canonical time, browser channel and cleanup;
- `results.json`: machine-readable test results and attached metrics;
- `report/index.html`: navigable report with screenshots and JSON attachments;
- `results/`: screenshots for every visual state, plus failure screenshots and traces;
- `vite-cache/`: isolated generated frontend dependency cache.

Open a specific report or trace by passing its printed path:

```text
pnpm exec playwright show-report <run-directory>/report
pnpm exec playwright show-trace <failed-test-directory>/trace.zip
```

`quality-gates` installs Chromium and runs the suite. CI retains evidence for
14 days on both success and failure. Test artifacts are ignored by Git; retain
reviewed summaries separately when a task needs a durable acceptance record.
There are no automatic retries and no accessibility exclusions that hide
failed checks.

Keep browser bootstrap/resource-loading failures, native test-worker exits,
and application assertion failures separate in the acceptance record. A
targeted repeat and a later successful full run do not prove that these
failure types shared a cause. Local Windows results do not establish a
successful hosted GitHub Actions run.

Implementation references: [Playwright global setup and teardown](https://playwright.dev/docs/test-global-setup-teardown),
[Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing),
and [axe Playwright integration](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright).
