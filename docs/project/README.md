# Project Memory — Index

This directory (`docs/project/`) is the project's long-term coordination memory, maintained by whoever is acting as lead engineer/orchestrator for implementation. It is separate from `docs/product/`, `docs/architecture/`, `design/`, and `brand/`, which are the actual specs — this directory tracks *status*, *decisions*, and *what's next*, not product/technical content itself.

## Files in this directory

- **`README.md`** (this file) — index and orientation.
- **`DECISIONS.md`** — append-only log of explicit product/technical decisions made during implementation, with rationale and what changed. Canonical when it conflicts with an older doc.
- **`ROADMAP.md`** — the vertical-slice build plan and current phase.
- **`AGENT_STATUS.md`** — what's built, what's in progress, what's untouched, per module.
- **`BLOCKERS.md`** — anything currently blocking forward progress. Empty when nothing is blocked.
- **`foundation-review.md`** — first-pass foundation review (superseded by `final-foundation-review.md`; kept for history, not re-litigated).
- **`final-foundation-review.md`** — the review that concluded READY WITH CHANGES; its remaining items were resolved in the 2026-09-16 cleanup pass (see `DECISIONS.md`).

## What is canonical

Per the source-of-truth hierarchy for this project:

1. Explicit decisions made in chat with the project owner
2. `DECISIONS.md` (this directory)
3. `docs/product/PRD.md` (v1.1, explicitly marked canonical/governing)
4. `docs/architecture/*` (rewritten to match the PRD as of 2026-09-15/16)
5. `design/*` (reconciled to match the PRD as of 2026-09-16)
6. `brand/*` (validated as consistent with the current model, no rework needed)

If any document appears to contradict a higher-priority source, the document is wrong and should be fixed — see `DECISIONS.md` for the process.

## Current state (as of 2026-09-16)

Foundation phase is complete. No known CRITICAL, HIGH, or MEDIUM documentation conflicts remain (see `DECISIONS.md` for the cleanup pass that resolved the final review's open items). Implementation has not yet started — see `ROADMAP.md` for the build sequence and `AGENT_STATUS.md` for live status.
