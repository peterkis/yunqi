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
pnpm exec playwright test --project=panel-light --grep annual-result
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
| Current | Root redirect, canonical Beijing time, annual/current cards, DTO boundary/countdown subtitles (remaining days and same-day clocks), movement relation text/tone, ratio-based hard-edge fill (±1px, no gradient), folded stages, six disclosures with Enter/Space, sources and SPA original-text drill-down |
| Annual | Direct entry defaults to the current API's YunQi year; current outage keeps the empty selector and manual recovery; real 2024/2025 responses; six radio choices with keys; exact API boundaries; URL, year-change focus, history/reload and 1900/2100 bounds |
| Rule trace | Real 2025 `GUEST_GENERATES_HOST` retains `客生主` and API `客生主，相得`; rule and Contract versions remain separate |
| Invalid year | Malformed/unsupported years send no business query; a valid selection recovers |
| Specified time | Submit-only; required input; explicit POST and minute/second normalization; pending/duplicate prevention; dirty-result hiding; sanitized error/retry and real unsupported-year recovery |
| Birth | Segmented numeric date/optional styled known time; no native date/radio inputs; submitted summary, edit/year focus and clear/expand; single-candidate metadata and all boundary candidates with canonical intervals; symmetric annual/period readings; edits hide old results; shell primary switches from 查看对照 to 同时测评体质 |
| Constitution | Button segments for sex, collapsed version eyebrow while answering; inline sex-change confirmation/count, cancel/Esc focus restore and direct zero-answer change in both themes; no native date/radio inputs; one question per screen, 26 applicable answers, keys 1–5, focus-only arrows, previous question, reduced motion; explicit complete submit; nine dimensions and parallel context; sex-change/end clearing |
| Same-page assessment | Lazy single questionnaire, no nested forms/current re-query, response snapshot, shared shell actions with standalone assessment, end/reopen/reset and stale response isolation |
| Result/actions (D3) | Real scoring responses for 1/2/7 biased matches in standalone and birth sessions at 400×640; one-line 30px title without ellipsis, matched chips only for ≥2 matches and tendencies whenever present, all in DTO order and neutral tone; no sex-change eyebrow on results, one readonly version meta in its disclosure; API summary/boundary disclosure, result drill-down header; external form association, pinned actions and content → actions → footer order |
| Navigation | Three segments with `aria-current`; deterministic drill-down return; no-query inquiry and not-found; skip link and keyboard scrolling; collapse/expand focus, draft/scroll retention, no summary fetch |
| Foundations and oracles | Local fonts and token measurements in both themes; type-scale rejection cases; root `pnpm test` runs four synthetic layout-fixture regressions |
| Craft (D5) | Tabular API times, date fields, year selector, answer progress and scores; narrow display separators with original book-title dots retained; quote-start trimming when supported; mouse/Tab theme focus in both themes; 140ms ease-out motion and zero reduced-motion transitions; DEV host background (production CSS exclusion runs with the Workbench build) |
| Runtime | Owned same-origin requests, no external resource requests, unhandled page errors or unexpected console errors; injected errors allowed only for the exact endpoint/status |
| Visual | Screenshots and type scale for every state; main text without seconds/milliseconds, canonical time attributes and exact calculation details; 1366×768 submitted birth headings and first annual-movement row in viewport; horizontal overflow, control fitting, single-line annual values and stage times; targets and primary-button count; every available focus target has a 2px ring; axe WCAG 2.1 A/AA scans |

### Visual states

`workbench.visual.spec.mjs` has 25 panel states, each run in all six panel /
workstation projects. The collapsed-pill spec adds two theme states at its
424 × 88 host viewport, containing the unchanged 400 × 64 pill with 12px
left/right, 10px top and 14px bottom margins. The seven prototype boards are represented as follows:

| Prototype / area | Test states |
| --- | --- |
| ① Current default | `current`, `current-stage-facts` (real calculated 2026-11-18 snapshot) |
| ② Original text | `current-classics`, `annual-classics` |
| ③ Birth/current | `birth-entry`, `birth-result`, `birth-boundary`, `birth-classics` |
| ④ Questionnaire in progress | `constitution-entry`, `constitution-questions`, `birth-assessment` |
| ⑤ Constitution result / completion | `constitution-complete`, `constitution-result`, `birth-assessment-complete`, `birth-assessment-result` |
| ⑥ Collapsed pill | `collapsed pill light`, `collapsed pill dark` in the pill project |
| ⑦ Workstation placement | All 25 panel states in `workstation-light`, `workstation-768` and `workstation-1080`; submitted birth first-screen check at 768 high and both current cards visible at heights ≥ 900 |
| Annual drill-down | `annual-entry`, `annual-result`, `annual-invalid`, `annual-error` |
| Specified-time drill-down | `calculate-entry`, `calculate-result`, `calculate-error`, `calculate-dirty` |
| Planning / not-found drill-down | `inquiry`, `not-found` (direct load) |

## UI refactor migration

Migration is complete: projects use the panel matrix below; there are no
per-view viewport overrides or demo responsive projects. Historical screenshots
are retained as evidence only, not as an approved visual baseline.

| Project | Viewport | Theme / states |
| --- | --- | --- |
| `panel-light` | 400 × 860 | Light, 25 panel states |
| `panel-dark` | 400 × 860 | Dark, 25 panel states |
| `panel-min-height` | 400 × 640 | Light, 25 panel states; current content scrolls while header, navigation and footer stay fixed |
| `collapsed-pill` | 424 × 88 host | Light and dark, two states; 400 × 64 pill, 12/10/14px margins, transparent host |
| `workstation-light` | 1366 × 900 | Light, 25 states; 400px panel at the right edge |
| `workstation-768` | 1366 × 768 | Light, 25 states; same right-edge panel, submitted birth headings and annual-movement row fit in the first screen |
| `workstation-1080` | 1920 × 1080 | Light, 25 states; same right-edge panel |

Collapsed host contract for the standalone Tauri window: **424×88 = 胶囊 400×64 +
左右各 12、上 10、下 14 外边距**, transparent background. Browser tests simulate
this host size; the pill retains `pill-height` and `shadow-pill` at every viewport size.
At that size its bounds are x12/y10/right12/bottom14. The host, theme root,
`#root`, `html` and `body` have transparent backgrounds without background images,
including the Vite DEV body's sunken surface; expanding restores the DEV backdrop.
Expanded panels use a 1px inset left hairline without a layout border, keeping
16px content padding on both sides and retaining `shadow-dock` for browser hosts.

Pill geometry attaches a shadow measurement with each screenshot. It checks the
computed outer shadow against `shadow-pill` and rejects CSS ancestors that clip
its estimated paint envelope. The envelope uses `1.5 × blur + spread` (three
Gaussian standard deviations), with signed viewport clearances. At the 424×88
host every clearance must be ≥ 0: the margins hold the full tail of `0 2px 8px`.
Larger panel viewports still record clearances as evidence only.

The suite discovers **65 flow/foundation/oracle tests + 152 visual/accessibility
tests = 217 tests in 12 files**. These are test cases and repeated state checks,
not independent clinical samples. Reproduce the inventory without launching a
browser (global setup and browser assertions do not run):

```text
pnpm exec playwright test --list
pnpm exec playwright test --list --project=flows-chromium
pnpm exec playwright test --list --grep @visual
```

E3's `current-stage-facts` uses the unmodified response from the real Service's
`learning/calculate` endpoint as a snapshot at `learning/current`. It retains a
visible partial fill at 400×860, 1366×768 and 1920×1080 (and the other panel
projects), with the existing type-scale, layout, screenshot and axe gates.
Three stage-facts flows exercise that snapshot and qi/movement end-date clocks;
the default current state still uses the runner's original fixed system clock.

Every screenshot calls the shared typography gate: allowed sizes
{40, 30, 24, 20, 15, 14, 12}, at most five distinct sizes on screen and only one
display alternative. Source tests require every CSS size to use `type-scale.css`
tiers. The minimum-height current state also captures its scrolled view.

Panel layout measures only shell-owned direct children. It retries the complete
original expectation group, including width, right-edge placement, header 52,
footer 36, scroll containment and document bounds. At workstation height ≥ 900,
annual and current cards must fit inside the content viewport at scrollTop 0.
Annual three-column values use a single `水运太过`-style label and stay on one
line at 400px. Icon targets are ≥ 32 × 32; options and primary buttons are
≥ 40 high; a view has at most one primary / solid-accent button, including
content below the current scroll position.

Focus checks visit every available button, link, input, select, summary and
explicit tabindex target in keyboard modality without activation. Exact 2px
solid outline / 2px offset assertions retry automatically, including C1/C5's
original regression assertions. D5 uses local 140ms ease-out tokens for selection
and disclosure motion, without transitioning outlines; reduced motion cancels
transitions and animations. Native disclosure remains instant when intrinsic-size
interpolation is unavailable. The previously observed not-found initial stylesheet timing
issue remains unconfirmed until a real browser run; the layout retry is kept.

The real Service / Vite environment, non-Beijing browser zone, external-request
rejection, runtime diagnostics, axe WCAG 2.1 A/AA tags (including contrast), and
per-run `.artifacts/browser/` evidence remain in force. `tests/browser-fixtures.test.mjs`
is part of root `pnpm test` and therefore CI; its four synthetic DOM/geometry
cases verify footer/header ownership, rejection of wrong dimensions and complete
measurement retry, not CSS rendering.

Viewport emulation does not establish physical-device, touch, screen-reader,
Firefox or WebKit compatibility. Screenshots need human inspection; no approved
pixel baseline exists. HIS patient data and copying to the medical record remain
outside authorization. The standalone window contract is confirmed; Tauri host
implementation is scheduled separately, and workstation coverage tests browser
placement only. A Chromium-blocked sandbox reports `pnpm test:browser` as NOT_RUN,
checks all browser modules with `node --check` and inventories tests with `--list`.

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
