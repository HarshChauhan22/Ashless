# UX Architecture — Ashless (Quit Smoking App, India)

Companion docs: [`design-system.md`](./design-system.md) (visual tokens) · [`screen-specifications.md`](./screen-specifications.md) (per-screen detail) · [`digital-smoking-room.md`](./digital-smoking-room.md) (core flow deep dive) · [`payment-flow.md`](./payment-flow.md) · [`quit-wallet.md`](./quit-wallet.md)

**Revision note (this pass):** reconciled against `docs/product/PRD.md` v1.1, now the canonical/governing document (see PRD's own banner — it supersedes the architecture docs' earlier platform-revenue model). Screen numbering below adopts the PRD's `SCR-xx` IDs directly so this design set and the PRD can be cross-referenced without translation. Changes from the previous version of this design set: primary Home CTA renamed to **"I WANT TO SMOKE"** (PRD Immutable Rule 4); Craving Intervention Hub rebuilt as a true three-way fork per PRD Principle 8 (was a demoted-link funnel); a standalone Craving Check-In screen (SCR-10) and Breathing Exercise screen (SCR-12) added back; Savings Destination screens (SCR-07 onboarding, SCR-30 settings) added; an Age Verification step added to close a gap neither the PRD nor this design set previously had a screen for; the money model is now the PRD's two-leg collect-then-payout mechanism — Quit Wallet is genuinely the user's own money in their own account, not a behavioral ledger with voucher/donation redemption (that model is fully retired, see `payment-flow.md`'s resolution note); Profile/Settings split into five screens (SCR-28–32) to match the PRD; Cigarettes Avoided Detail (SCR-26) added.

**Revision note (latest pass):** SCR-14 (Cigarette Selection) expanded into a full brand-selection experience per a new product requirement — search, brand switching, "I can't find my brand," custom brand entry, and inline pack price/size configuration with a live cost-per-cigarette calculation, all reached without breaking the single-tap fast path for the common returning-user case. SCR-16's primary CTA is now the literal label **"SAVE ₹[amount]"** (uppercase). Full detail in `digital-smoking-room.md`. No other screen, journey, or nav structure in this document changed.

---

## 1. Information Architecture

```
Unauthenticated
├── Splash (SCR-01)
├── Onboarding Carousel (SCR-02)
├── Phone Entry (SCR-03)
└── OTP Verification (SCR-04)

First-run Onboarding (authenticated, one-time)
├── Age Verification (SCR-04A)
├── Smoking Profile Setup (SCR-05)
├── Quit Motivation & Goal Selection (SCR-06)
├── Savings Destination Setup (SCR-07)
└── Notification Permission Priming (SCR-08)

Main Tab Navigation (bottom nav, persistent)
├── Home (SCR-09)                     — dashboard, primary "I WANT TO SMOKE" CTA
├── Wallet                            — Quit Wallet (SCR-22), Savings History (SCR-23), Savings Goals (SCR-24)
├── Progress (SCR-25)                 — stats, Cigarettes Avoided detail (SCR-26)
├── Coach                             — AI Craving Coach entry (SCR-13)
└── Profile / Settings (SCR-28)       — Smoking Profile Edit (SCR-29), Payment & Savings Destination (SCR-30),
                                         Account & Privacy (SCR-31), Help & Support (SCR-32)

Global / Modal Flows (reachable from Home CTA or push notification, not tabs)
├── Craving Check-In (SCR-10)
├── Craving Intervention Hub (SCR-11)
│   ├── Breathing Exercise (SCR-12)
│   └── → AI Craving Coach Chat (SCR-13)
├── Digital Smoking Room
│   ├── Cigarette Selection (SCR-14) — carries the "honest confrontation" beat inline, see digital-smoking-room.md
│   ├── Quantity Selection (SCR-15)
│   ├── Amount Confirmation (SCR-16)
│   ├── UPI Payment Handoff (SCR-17)
│   ├── Payment Processing (SCR-18)
│   ├── Payment Success (SCR-19)
│   └── Payment Failure / Retry (SCR-20)
├── Relapse Log (SCR-21)
└── Notifications Center (SCR-27)
```

**On Age Verification:** this screen is now formally **SCR-04A** in the PRD's own numbering (`docs/product/PRD.md` §H/§I) — backfilled 2026-09-16 per `docs/project/DECISIONS.md`, resolving the gap this design layer previously had to fill on its own (the foundation review's §2.H / final-foundation-review's item 6). Positioned right after OTP Verification (SCR-04) and before Smoking Profile Setup, since age eligibility should be confirmed before any product data collection, not after.

---

## 2. Primary User Journeys

### Journey A — First-run activation
`Splash → Onboarding Carousel → Phone Entry → OTP Verification → Age Verification → Smoking Profile Setup → Quit Motivation & Goal Selection → Savings Destination Setup (skippable) → Notification Permission Priming → Home`

Every step from Smoking Profile Setup onward is resumable/skippable except the auth steps and Age Verification itself (PRD Functional Requirement 14) — a user can reach Home with an incomplete profile or destination and finish later, but can never reach Home without having passed the age check. Savings Destination is explicitly skippable at onboarding (PRD §L.1) but becomes a hard block the first time the user actually tries to pay (SCR-16) — see `digital-smoking-room.md`.

### Journey B — Daily check-in (no craving)
`Home → glance at streak/wallet → close app` or `Home → Progress/Wallet tabs → close app`
Majority-case session. Home must be useful with zero taps — today's smoke-free count, today's saved amount, and the "I WANT TO SMOKE" CTA all visible above the fold (PRD Principle 6: progress visible within two taps).

### Journey C — The core loop: craving → redirect → reward
Two entry points into this loop exist on purpose (PRD §G, `user-flows.md` §1) — this is a direct behavioral requirement, not a design nicety:

- **`Home "I WANT TO SMOKE" → Craving Check-In (SCR-10) → Craving Intervention Hub (SCR-11)`** — for a user who wants support deciding what to do next. The Hub is a genuine three-way fork (breathing / AI coach / Digital Smoking Room), never a funnel that demotes the Room.
- **`Home "Open Smoking Room" (secondary action) → Cigarette Selection (SCR-14) directly`** — for a user who already knows they want to log a save and doesn't want an extra screen in the way. This path skips Check-In and the Hub entirely.

Both converge on `Cigarette Selection (SCR-14) → Quantity Selection (SCR-15) → Amount Confirmation (SCR-16) → UPI Payment Handoff (SCR-17) → Payment Processing (SCR-18) → Payment Success (SCR-19) or Payment Failure (SCR-20)`. See `digital-smoking-room.md` for the full emotional design of this path and `payment-flow.md` for the two-leg collect-then-payout mechanics behind SCR-17–20.

### Journey D — Relapse (the user did smoke)
`Any "I already smoked" shortcut (Home, Intervention Hub, AI Coach chat) → Relapse Log (SCR-21) → Home`
No payment, no wallet interaction, no negative-coded UI (PRD Principle 2, §IX.4).

### Journey E — Reflection / passive engagement
`Wallet tab → Savings History (SCR-23) / Savings Goals (SCR-24)` and `Progress tab (SCR-25) → Cigarettes Avoided Detail (SCR-26)`
Lower-frequency, higher-dwell-time journeys once the novelty of the core loop settles.

### Journey F — Support-seeking
`AI Craving Coach (SCR-13)` — reachable from the Intervention Hub, a floating entry point on Home, and the Coach tab. Always exits via "Go to Smoking Room instead" or "I already smoked" shortcuts (PRD Acceptance Criteria), never a dead end.

### Journey G — Fixing a Savings Destination problem (new — see `payment-flow.md` §Payout failure)
`Notification ("Your save didn't complete") → Savings History (SCR-23) transaction detail → Payment & Savings Destination Settings (SCR-30) → fix destination → Home`
This is the async recovery path for the payout-leg failure mode PRD §L.5a introduces — it doesn't exist in a single-leg payment model, and it's the one journey in this app where a *successful*-feeling moment (SCR-19 already rendered) can later need a correction. Handled entirely through Notifications + Settings, never by retroactively "un-succeeding" SCR-19.

---

## 3. Navigation Model

- **Bottom navigation** (5 equal-weight tabs, persistent on Home/Wallet/Progress/Coach/Profile): **Home · Wallet · Progress · Coach · Profile** — matches PRD §H exactly. There is no raised center "SOS" nav item; an earlier draft of this design added one, but it's retired (see `design-system.md` §9, corrected in the same revision pass as this document) since PRD's actual nav is five plain tabs and the fast path into the craving flow already lives on Home itself via its own "I WANT TO SMOKE" primary CTA and "Open Smoking Room directly" secondary action (`digital-smoking-room.md` SCR-09) — no nav-bar shortcut is needed or present.
- **Digital Smoking Room (SCR-14–20) is a full-screen takeover**, no bottom nav. Back-swipe is intercepted with a confirm step once a quantity has been selected; unrestricted before that. **SCR-18 (Payment Processing) is the one screen in the entire app with no exit at all** — not even a top-left close — per PRD §H's explicit navigation rule, to prevent a duplicate-submission race while a PA request is in flight.
- **Craving Check-In → Intervention Hub → Breathing/Coach/Room** is also a full-screen sequence, exited via a visible top-left close at every step except Payment Processing.
- **AI Coach** opens full-screen (needs room to converse) from: Home's floating entry point, the Intervention Hub card, or the Coach tab.
- **Notifications** open full-screen from a bell icon on Home; deep-link to source context (e.g., a payout-failure notification opens Savings History's transaction detail directly).
- **Relapse Log** entry points: Home (low-emphasis link), Intervention Hub ("I already smoked"), AI Coach chat (always-visible shortcut). All converge on SCR-21.

---

## 4. State Model Notes (cross-cutting)

- **Streak** = consecutive smoke-free days. Resets to 0 on a logged relapse. Never resets on a payment failure or an abandoned Digital Smoking Room session.
- **Quit Wallet balance** = sum of Ledger Entries minus reversals, always recomputed from the ledger, never hand-set (PRD §L.6–L.7). Per PRD Immutable Rule 6, this is genuinely the user's own money that was moved to their own Savings Destination — not platform revenue, not a rewards balance, not a claim on funds the platform holds even momentarily. See `payment-flow.md`/`quit-wallet.md` for the full two-leg mechanics this implies.
- **Payout status** (new state, per PRD §L.5a) — every Ledger Entry carries `payout_status: initiated | completed | failed`, independent of the ledger entry itself existing. This is surfaced quietly (a small status marker in Savings History) in the common case and prominently (a notification + Settings deep-link) in the rare failure case. The Quit Wallet balance is never gated behind full payout settlement — SCR-19 renders and the balance updates as soon as the *collection* leg is confirmed (PRD §L.4).
- **Savings Destination** = the user's own bank account/VPA, registered as a payout beneficiary with the PA. Required before any payment can complete — skippable at onboarding, hard-blocked at first payment attempt (PRD §L.1, Functional Requirement 5).
- **Craving events** are logged regardless of outcome (resisted-at-intervention, resisted-via-payment, abandoned, or relapsed) — feeds Progress trends and AI Coach context. Craving Check-In's optional intensity/trigger data attaches to this event.

---

## 5. Screen Inventory — Zone Mapping

| SCR | Screen | Emotional zone | Nav context |
|---|---|---|---|
| 01 | Splash | Neutral | — |
| 02 | Onboarding Carousel | Neutral | Linear, pre-auth |
| 03 | Phone Entry | Neutral | Linear, pre-auth |
| 04 | OTP Verification | Neutral | Linear, pre-auth |
| 04A | Age Verification | Neutral | Linear, post-auth, first-run |
| 05 | Smoking Profile Setup | Neutral | Linear, post-auth, first-run |
| 06 | Quit Motivation & Goal Selection | Neutral | Linear, post-auth, first-run |
| 07 | Savings Destination Setup | Neutral | Linear, post-auth, first-run (skippable) |
| 08 | Notification Permission Priming | Neutral | Linear, post-auth, first-run |
| 09 | Home | Neutral/Reward | Bottom nav root |
| 10 | Craving Check-In | Tension | Full-screen, entry into the fork |
| 11 | Craving Intervention Hub | Tension→Neutral | Full-screen, true fork |
| 12 | Breathing Exercise | Tension→Neutral | Full-screen |
| 13 | AI Craving Coach Chat | Neutral | Global overlay / Coach tab |
| 14 | Digital Smoking Room: Cigarette Selection (Brand Selection) | Tension→Decision | Full-screen takeover |
| 15 | Digital Smoking Room: Quantity Selection | Decision | Full-screen takeover |
| 16 | Digital Smoking Room: Amount Confirmation | Decision | Full-screen takeover |
| 17 | UPI Payment Handoff | Decision | Full-screen takeover, minimal UI |
| 18 | Payment Processing | Decision | Full-screen takeover, no exit |
| 19 | Payment Success | Reward | Full-screen takeover → Home |
| 20 | Payment Failure / Retry | Neutral | Full-screen takeover |
| 21 | Relapse Log | Neutral (never Alert) | Global overlay |
| 22 | Quit Wallet | Reward | Bottom nav (Wallet) |
| 23 | Savings History | Reward | Wallet sub-screen |
| 24 | Savings Goals | Reward | Wallet sub-screen |
| 25 | Progress / Stats | Reward | Bottom nav (Progress) |
| 26 | Cigarettes Avoided Detail | Reward | Progress sub-screen |
| 27 | Notifications Center | Neutral | Global overlay |
| 28 | Profile & Settings | Neutral | Bottom nav |
| 29 | Smoking Profile Edit | Neutral | Settings sub-screen |
| 30 | Payment & Savings Destination Settings | Neutral | Settings sub-screen — highest-caution screen in Settings |
| 31 | Account & Privacy | Neutral | Settings sub-screen |
| 32 | Help & Support | Neutral | Settings sub-screen |

33 screens total, all now carrying formal PRD `SCR-xx` IDs (Age Verification's earlier gap-fill status is resolved — see PRD §H, now `SCR-04A`). Full per-screen detail is in `screen-specifications.md`, `digital-smoking-room.md`, `payment-flow.md`, and `quit-wallet.md` as cross-referenced above.
