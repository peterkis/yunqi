# E1 review closeout implementation plan

Base: `883c6f096cab02c2428004f49718e56afd24dc77` (delivery A, PR #12).
Branch: `codex/phase3-e1-review-closeout`. User-approved closeout only.

1. RED: route-level real empty click must show an accessible input error with
   no Client call; old implementation must fail before transferring repairs.
2. GREEN: transfer the five previously reviewed Workbench files from the
   preserved main-worktree snapshot; keep native required validation and
   route invalid events to the shared owner. Restore input focus when needed.
3. Verify keyboard invalid submit, fractional-seconds input without value
   sanitization, second precision payload, dirty/empty-after-success, pending,
   failure/retry and unchanged routes. Tests use the existing injected Client
   boundary; no medical expected values are created.
4. Run final repository gates and build. Use a temporary external same-origin
   harness, real Service, and local Edge for three exact viewport runs,
   screenshots, Network payload/count/status and Console/page-error capture.
   Fault/delay injection is test-only and labeled. No production proxy.
5. Record code SHA, artifacts and results; obtain independent Spec/Standards
   review. Fix findings, verify affected behavior and current PR CI, then merge.

Only Workbench implementation/tests and verification documents may change.
Frozen packages, Contract, dependencies and lockfile remain unchanged.
Browser evidence failure is BROWSER_BLOCKED, preventing B merge and C start.
E3/E4 and clinical G1–G6 remain gated on real external evidence.
