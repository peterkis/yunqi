# E2 feedback evidence closeout plan

Base: `13f2ac77c53fa25d49fef882be69d14f97c5da3a` (B merged via PR #13).
Branch: `codex/phase3-e2-feedback-evidence-closeout`.

1. Transfer the two preserved protocol/template repairs into this worktree.
2. Distinguish verbatim raw form time from API canonical localTime; explicitly
   state fixed Beijing +08:00 semantics and preserve raw minute/second precision.
3. Add annual-task and per-example completion status, separate from comprehension
   and rule agreement. Bind feedback to session, full build SHA and task/example.
4. Require omission of patient-linked times; leave all new answer fields blank.
5. Validate Markdown table shape, empty reference CSV/session/reference sources,
   NOT_RUN clinical gates, docs-only diff, Contract and time/Workbench governance.
6. Obtain independent standards/spec review, current-head CI, then squash merge.

No runtime/schema/dependency changes or expert clinical conclusions. E3/E4
remain blocked pending independently supplied real evidence.
