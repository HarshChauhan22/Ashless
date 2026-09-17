# MVP / V1 / Future Scope — Digital Smoking Room

Companion to [PRD.md](./PRD.md). Screen IDs (SCR-xx) and user story IDs (US-xx) match the PRD and [user-stories.md](./user-stories.md).

Scope is cut along one test: **does removing this break the core loop (craving → Smoking Room → real payment → real savings) or the trust/safety/legality of that loop?** If yes, it's MVP. If it improves or extends the loop without being load-bearing, it's V1. If it's a meaningfully different product surface, it's Future.

---

## P. MVP Scope

The MVP must prove the core thesis end-to-end with real money, for a single-language-primary, single-currency, single-country audience, before investing in breadth.

**Included:**

1. Phone + OTP authentication (US-01, US-02).
2. Single or multiple smoking profiles — brand, pack price + cigarettes per pack (or direct per-cigarette price for single-stick-only buyers), daily quantity (US-03, US-04). Multiple profiles are included in MVP, not deferred, because single-stick/multi-brand purchasing is core to the target user (PRD §B), not an edge case.
2a. The Brand Picker (usual brand, recently/previously used, search, custom "I can't find my brand" entry with inline price configuration) is MVP, shared across onboarding and the Digital Smoking Room (US-21, US-48 through US-52, and PRD §I SCR-14/SCR-05) — this is the mechanism that keeps the core promise ("mirrors your real spend") true for non-brand-loyal users, not a nice-to-have on top of it.
3. Motivation/goal capture, including both "cut down" and "quit completely" as valid goals (US-05, US-06).
4. Savings Destination setup, skippable at onboarding, required before first payment (US-07, US-08).
5. Home dashboard: streak, money saved, cigarettes avoided, primary "I WANT TO SMOKE" CTA, secondary "Open Smoking Room" (US-10, US-11, US-12).
6. Craving Check-In and Intervention Hub, with all three paths (breathing, Quick Distraction, Smoking Room) plus the "I already smoked" shortcut (US-15, US-16). **Revision 2026-09-16** (see [DECISIONS.md](../project/DECISIONS.md)): Quick Distraction replaces AI coach as the Hub's third equal-weight option; AI coach remains in the product (item 8 below) but is reached via its own entry point, not the Hub.
7. Breathing exercise (US-17).
8. AI Craving Coach — text chat, with the non-clinical disclaimer and crisis-escalation guardrail as a hard requirement, not a follow-up (US-18, US-19, US-20; PRD §IX.2–3).
9. Digital Smoking Room in full: brand selection, single-stick-capable quantity selection, amount confirmation, real UPI payment via a licensed Payment Aggregator, payment verification, ledger write, success/failure states including the pending/unconfirmed branch (US-21 through US-29; PRD §L in full).
10. Quit Wallet: balance, "how this works" non-custodial explanation, Savings History (US-30 through US-32, US-35).
11. One savings goal label (US-33, US-34) — a single active goal is sufficient to validate the mechanic; multiple concurrent goals can wait for V1 if it simplifies the initial build, see note below.
12. Relapse logging, fully neutral-toned, with partial-quantity support (US-36 through US-38).
13. Progress screen: streak, cigarettes-avoided with its calculation breakdown (US-13, US-14).
14. Core settings: edit smoking profile, edit savings destination, notification toggles, data export/deletion request, help/support with a verified helpline resource, payment dispute entry point (US-39 through US-44).
15. Reconciliation job and refund/duplicate-payment handling (PRD §L.9–§L.12) — this is MVP, not V1, because it is a correctness/trust requirement of the payment loop itself, not an enhancement.
16. Hindi + English language support (PRD §O).
17. Age-gating at onboarding (PRD §IX.8).

**Note on savings goals in MVP**: a single active goal (US-33/34) is listed as included above; if implementation pressure requires a cut, collapsing this to "no named goal, just the total balance" (i.e., deferring SCR-24 entirely) is the single most defensible MVP trim in this list, since the core loop and its trust properties are fully intact without it. Flagged here rather than pre-decided, since it's a scope-vs-timeline tradeoff, not a product-thesis question.

---

## Q. V1 Scope

Extends and strengthens the validated MVP loop; nothing here changes the core financial model.

1. Multiple concurrent savings goals with individual progress tracking (if trimmed from MVP per the note above).
2. Proactive, pattern-based craving reminder notifications (US-45) — requires enough MVP usage data to build real patterns, so it's sequentially dependent on MVP, not just lower priority.
3. Richer Progress analytics: trigger-tag breakdowns on Cigarettes Avoided (SCR-26), streak calendar/heatmap depth (US-14).
4. Expanded language support beyond Hindi/English, based on observed MVP user base composition.
5. Support for additional payment methods beyond UPI intent/collect if the chosen PA and user base warrant it (still within the non-custodial model of §L — this is a rail addition, not an architecture change).
6. Social/sharing of milestones (opt-in, non-required) — additive motivational layer, not core to the loop.
7. Multiple savings destinations with per-goal routing (e.g., different goals to different accounts) — still non-custodial, just a richer version of the same L.1 model.
8. Smarter, more context-aware AI coach (longer memory across sessions, more personalized prompts) — same safety guardrails as MVP, just better within them.
9. Google Sign-In as an alternative to phone+OTP — explicitly cut from MVP (decision 2026-09-16, see [DECISIONS.md](../project/DECISIONS.md)); the architecture (`security.md` §2.4, `api-spec.md` §3.1) documents the shape as a V1-ready option, not built for MVP.

---

## R. Future Scope

Meaningfully different product surface or requires new regulatory/partnership groundwork — not to be pulled forward without a deliberate decision.

1. **Actual fund custody / locked savings with incentives** (e.g., bonus or interest for hitting a savings goal) — requires a licensed PPI partner or bank-partnered escrow arrangement; out of scope until that partnership exists (PRD §L.8).
2. Integration with formal cessation support (NRT partnerships, doctor/clinic referral, insurance-linked wellness programs) — a distinct product relationship, not a feature toggle.
3. Family/accountability-partner features (sharing progress with a spouse/friend) — introduces a second user's data/consent model, deliberately excluded from MVP/V1 scope.
4. iOS platform — the brief specifies Android-first; iOS is a separate platform investment decided later based on MVP/V1 traction.
5. Voice-based AI coach interaction.
6. Employer or insurer-facing dashboards/aggregate reporting — a B2B2C product direction requiring its own privacy and consent model on top of §IX.
7. Automated/recurring "auto-save" without per-transaction confirmation — deliberately excluded even from V1 per Principle 7; would require a distinct consent and risk model if ever pursued.

---

## S. Explicitly NOT in MVP

Called out separately from "V1/Future" because these are patterns that might otherwise creep in by default during build, and must be actively avoided:

- **No stored/reusable payment authorization** ("pay again with one tap" using a saved mandate) — every MVP payment requires explicit per-transaction confirmation (PRD Principle 7).
- **No withdrawal/redemption flow** — the MVP model doesn't need one and must not simulate one, since money never leaves the user's own ecosystem (PRD §L.8). Building a withdrawal screen for MVP would be building for a custody model the product doesn't have.
- **No gamified currency (points, coins, badges-as-currency)** standing in for real money at any point in the core loop (Principle 3) — badges/milestones as *decoration on top of* real ledger data are fine; as a *substitute* for it, they are not.
- **No punitive/red-coded relapse or streak-loss UI** (Principle 2, §IX.4) — this must be treated as a build constraint the same way a security requirement is, not a "nice to have" tone note.
- **No tobacco brand imagery, catalog-style browsing, "popular/recommended" surfacing, or anything resembling a storefront** in the cigarette selection step (Principle 4) — this is a legal/policy risk (PRD §VIII), not just a design preference.
- **No admin-controlled or catalog-sourced cigarette pricing anywhere in the payment path** (Immutable Rule 3) — every amount charged is computed from the selected Smoking Profile's own pack-price/per-cigarette entry, never from a shared reference table. The admin-managed brand list (`cigarette_brand_reference`) is names-only and must never grow a price field.
- **No medical/clinical claims** anywhere in copy (§IX.1).
- **No third-party advertising/analytics SDKs receiving smoking-status or craving data** (§IX.5, §O privacy).
- **No silent balance corrections** — every reconciliation adjustment must be a visible, dated ledger entry with user notification (§L.12), never a quiet number change.
