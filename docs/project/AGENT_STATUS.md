# Status

Snapshot of what exists vs. what's planned, by module. Updated as implementation proceeds — this is not a historical log (see `DECISIONS.md` for that), it reflects current state only.

## Documentation / Foundation

| Area | Status |
|---|---|
| Product (PRD, user flows, MVP scope, user stories, analytics) | Complete, internally consistent, canonical. Updated 2026-09-16 for the Quick-Distraction-replaces-AI-coach decision (DECISIONS.md D-009). |
| Brand (strategy, visual identity, naming) | Renamed 2026-09-16: **Ashless** (was Jeb) — new logo/mark built and applied everywhere. See DECISIONS.md D-010. |
| UX/UI (ux-flow, screen-specifications, digital-smoking-room, payment-flow, quit-wallet, design-system) | **Stale as of 2026-09-16 (D-011)** — `design-system.md`'s light theme, `ux-flow.md`'s five-flat-tab nav, and the PRD's uppercase "I WANT TO SMOKE" CTA copy no longer match the shipped app, which now follows the original Claude Design canvas artifact exactly. Doc-sync pass not yet done — see DECISIONS.md D-011. |
| Architecture (system, database, API, payment, security, deployment) | Complete, reconciled to PRD v1.1, all known contradictions resolved (2026-09-16) |
| Cross-document conflicts | None known outstanding (CRITICAL/HIGH/MEDIUM/LOW) — see `DECISIONS.md` |

## Application code

**A genuinely complete, navigable web prototype** at `webapp/` (Next.js 14 + TypeScript + Tailwind + Zustand), covering all 5 bottom-nav tabs plus the full craving flow — not just the Phase 1 core-loop slice. Built as a web app rather than the native stack by explicit decision (no existing codebase existed to modify; see the conversation history for why). Follows the documented data model, financial-integrity rules, and event names as closely as a non-native, in-memory prototype allows.

| Area | Status |
|---|---|
| Visual design | **Dark theme, matching the original Claude Design canvas artifact exactly (D-011)** — replaced the light warm-cream theme from Phases 6–9. |
| Auth | Mock phone+OTP (code always `123456`), bare userId header — not real JWT/Firebase |
| Home | Streak ring, "Total saved so far," "I'm craving" CTA (soft copy, D-011 — not uppercase "I WANT TO SMOKE"), top savings-goal preview |
| Craving Intervention Hub | Three cards: Breathing, Quick Distraction, Digital Smoking Room (D-009); "I already smoked" routes to a dedicated Relapse Flow screen. Craving Check-In step removed (D-011) — not in the artifact's flow. |
| Breathing | 60s countdown ring, +15s (D-011, was +30s), Stop, "I feel better" / "Back to options" |
| Quick Distraction | 10 India-first jokes as a tap-to-expand accordion (D-011 — was a grid-to-detail-view pattern) |
| Digital Smoking Room | New `SmokingRoomEntry` interstitial (D-011) → brand picker (select-then-Continue radio list) → quantity stepper → amount confirmation ("the pivot") → in-app UPI method picker (D-011, replaces the old "Opening your UPI app…" placeholder) → server-side verification → PaymentSuccess screen → post-payment "sit with it" timer (no extend button) → reinforcement |
| Wallet tab (Quit Wallet) | Total tracked savings, "How this works," this-month/cravings-redirected stats, inert Redeem stub, top goal preview, merged Recent Activity feed (redirected credits + logged relapses in one list, D-011) |
| Savings Goals (`/wallet/goals`) | New dedicated screen (D-011): goal cards with progress, est. completion, "Redeems as" label, suggested-goal chips, add-goal form |
| Progress tab ("Track" in nav) | Streak, longest streak, cigarettes avoided, breakdown by trigger tag |
| Coach | **No longer a bottom-nav tab (D-011)** — reachable via Relapse Flow's "Talk to AI Coach about this" and a Profile link. Still rule-based (`lib/ai-coach.ts`, not a real LLM call), crisis-language detection with fixed helpline escalation. |
| Profile tab | Smoking profile edit/delete/set-primary, mock Savings Destination, notification-preference toggles (local-only), Account & Privacy stubs, Help & Support (+ Talk to AI Coach link), logout |
| Relapse Flow | New dedicated screen (D-011) at `/craving/relapse`: optional trigger chips, reassurance card, "Log it," link to Coach — correctly resets the streak clock, never touches the balance (verified) |
| Bottom nav | **Home · Track · [raised craving-colored FAB] · Wallet · Profile (D-011)** — reverses D-001's five-flat-tabs call now that the original artifact has been read in full; the FAB opens the Craving Intervention Hub directly. |
| Android app (Kotlin/Compose) | Not started — Phase 7, "port the validated web prototype," not a from-scratch design exercise |
| Backend (NestJS) / Database (Postgres) | Not started as standalone services — logic lives in Next.js API routes + an in-memory store (`webapp/lib/db.ts`) shaped like the documented schema, structured so porting is a lift-and-shift |
| Payment integration | Mock provider only (`webapp/lib/payment-provider.ts`); server-computed amount, idempotent create/verify, amount-tamper and negative-quantity rejection all tested. **No payout leg simulated** — PRD §L's two-leg model and its payout-failure/auto-refund path (§L.5a) have no code yet. Real Razorpay/RazorpayX deferred to Phase 6. |
| Notifications | Not built at all — no Notifications Center screen, no push wiring |
| CI/CD | Not started |

## Current phase

**Phases 1–5 done** (as a web prototype — see `ROADMAP.md` for the phase breakdown and what was deliberately deferred or condensed in each). The app is genuinely clickable end-to-end across all 5 tabs, not just the original core-loop slice.

Next: Phase 6 (real payment provider + actual two-leg payout simulation) or Phase 7 (native Android + NestJS port) — both are real, separate bodies of work, not started.

## Last significant event

2026-09-16 (later same day): Re-skinned and partially restructured the entire web prototype to match the original Claude Design canvas artifact exactly, per an explicit "I want EXACTLY this" instruction (DECISIONS.md D-011) — dark theme, four-tab+FAB nav (Coach demoted to a contextual link), softer Home copy, new SmokingRoomEntry interstitial and in-app UPI picker, new Savings Goals and Relapse Flow screens, merged Wallet activity feed, and the Craving Check-In step removed. Full manual browser walkthrough re-run end-to-end afterward (see D-011's Verified line); `tsc --noEmit` and `npm run build` both clean.

2026-09-16 (earlier): Expanded from the Phase 1 core-loop slice into a full navigable app — bottom nav, Craving Check-In, Wallet (goals + history), Progress (trigger breakdown), AI Coach (rule-based, crisis-escalation tested), and Profile/Settings. Also renamed the app from "Jeb" to "Ashless" with a new logo (DECISIONS.md D-010) and propagated it everywhere.
