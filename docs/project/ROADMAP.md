# Roadmap

Build order is vertical-slice, not layer-by-layer — a complete, working journey end-to-end before moving to the next, per the project owner's explicit instruction. Do not build all screens independently and wire them up at the end.

## Phase 0 — Foundation (COMPLETE)

Product, brand, UX, architecture, and two rounds of cross-document review. No known CRITICAL/HIGH/MEDIUM conflicts remain as of the 2026-09-16 cleanup pass (`DECISIONS.md`).

## Phase 1 — First vertical slice: the core loop, mocked payment (DONE, 2026-09-16)

Login, Home, Craving Intervention Hub, full Digital Smoking Room (brand picker → quantity → amount → mock UPI → server verification → ledger), post-payment 60s timer, reinforcement, relapse logging. Built as a web prototype at `webapp/` (Next.js) rather than the native stack — see `AGENT_STATUS.md` for why. See `DECISIONS.md` D-009 for the Quick-Distraction-replaces-AI-coach change made during this phase.

## Phase 2 — Craving Check-In + bottom nav + full app shell (DONE, 2026-09-16)

Added back Craving Check-In (SCR-10, intensity/trigger capture) between Home and the Intervention Hub, and built the persistent 5-tab bottom nav (Home · Wallet · Progress · Coach · Profile, `design-system.md` §9) that Phase 1 didn't have at all. This turned the single-flow Phase 1 slice into an actually-navigable app.

## Phase 3 — AI Coach (DONE, 2026-09-16 — rule-based, not a real LLM call)

Chat UI at the Coach tab: opening message, quick-reply chips, crisis-language keyword detection with a fixed escalation response (India helpline numbers per `system-architecture.md` §9.2), always-available "Go to Smoking Room instead" / "I already smoked" shortcuts, persistent non-clinical disclaimer. **`lib/ai-coach.ts` is a keyword-matched responder, not a call to Claude or any other LLM** — wiring a real model needs an API key and explicit approval this prototype doesn't have (per the project owner's "do not connect live external infrastructure without approval" instruction). Swapping in a real model later is a `respondTo()`-body-only change.

## Phase 4 — Goals, Progress (DONE, 2026-09-16); Notifications (not done)

Savings Goals (create/list, progress computed against the shared wallet balance per PRD's "label, not segregated pool" model) on the Wallet tab. Progress tab: streak, longest streak, cigarettes avoided, breakdown by trigger tag (now populated by Phase 2's Check-In data). **Not built**: a Notifications Center screen, or any push notification wiring — there's no async event in this prototype (no real payout leg, see below) that would need to notify a user after they've left the app, so this was deprioritized versus breadth across the other tabs.

## Phase 5 — Settings & account (DONE, 2026-09-16, condensed into one Profile tab)

Smoking Profile edit/delete/set-primary, a mock Savings Destination (label only, no real bank/UPI verification), notification-preference toggles (local state only, not wired to a real preferences store or actual push delivery), Account & Privacy stub rows (Export/Delete — not implemented, just present), Help & Support with the helpline numbers, logout. **Deliberately condensed** from the PRD's 4 separate settings screens (SCR-29/30/31/32) into one scrollable Profile page — a legitimate consolidation for a demo, matching the same reasoning Home already used.

## Phase 6 — Production payment integration preparation (NOT STARTED)

Swap `MockPaymentProvider` for a real Razorpay/RazorpayX implementation behind the existing `PaymentProvider`/`PayoutProvider` interfaces, and actually build the two-leg collect-then-payout mechanism (PRD §L) — the current prototype does **not** simulate a payout leg at all; "success" is shown at collection-verify time and nothing further happens, which is faithful to PRD §L.4's rule that the client doesn't wait on payout settlement, but the payout-failure/auto-refund path (§L.5a) has no code behind it yet. Requires real PA vendor sign-off on the use case (PRD §L.13, a named risk), legal review of the collect-then-payout pattern, ToS finalization, real beneficiary verification flow testing. **Do not connect live financial infrastructure without explicit configuration and approval.**

## Phase 7 — Native Android + real backend port (NOT STARTED)

Port the now-validated web-prototype logic (data model, financial-integrity rules, event names) to the documented Kotlin/Compose + NestJS/Postgres stack. The web prototype's `lib/db.ts`, `lib/payment-provider.ts`, and API route shapes were deliberately written to mirror `database-schema.md`/`api-spec.md`/`payment-architecture.md` so this is a lift-and-shift, not a redesign.

## Phase 8 — QA / security hardening (NOT STARTED)

Full test matrix from the project owner's quality-control checklist (duplicate payment, duplicate webhook, altered amount, failed/pending payment, refund, replay, unauthorized savings modification, race conditions) run against the real provider in a sandboxed/test-mode environment before any production credential is used.

---

**Known gaps in the current web prototype** (not silently glossed over): no real payout leg/payout-failure simulation (Phase 6); no Notifications Center; Account & Privacy export/delete are inert stub rows; notification-preference toggles don't persist or do anything; AI Coach is rule-based, not a real model call; auth is a bare userId header, not real JWT/Firebase. All noted inline in the relevant code comments too.

Update this file's phase markers as work completes. Do not silently skip ahead — if a later phase's work is requested before the current phase's definition of done is met, flag it rather than proceeding out of order.
