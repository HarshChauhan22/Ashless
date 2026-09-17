# Final Foundation Review

Reviewed against the current on-disk state of `docs/product/*`, `docs/architecture/*`, `design/*`, `brand/*`. This supersedes `docs/project/foundation-review.md` as the live readiness assessment, but that document's history/resolution trail is still accurate and not contradicted here — it is not being reopened, only built on. Nothing in the source documents was edited as part of this review.

## 1. Overall Status

**READY WITH CHANGES**

The single conflict that made the previous review's verdict NOT READY — two incompatible financial models — is genuinely resolved. The PRD (v1.1, now formally canonical) specifies a concrete two-leg collect-then-payout mechanism, and all five architecture documents and all five design documents have been rewritten to match it, with mutual cross-references and explicit revision notes rather than silent overwrites. The new brand-selection requirement (search, custom brand, pack-price/size, cost-per-cigarette calculation) is also fully and consistently threaded through the PRD, user stories, MVP scope, database schema, API spec, and UX design. This is a materially stronger foundation than the previous pass.

No CRITICAL conflicts remain. One HIGH-severity direct contradiction and several MEDIUM gaps remain — all are narrow, named, and fixable in hours to a couple of days, not a re-architecture. Fix the items in §10 before coding begins on the affected surfaces (bottom navigation shell, auth scope, the `craving_sessions` outcome enum, payout analytics) — the rest of the foundation can be built against today.

---

## 2. Product Consistency

PRD v1.1 is internally consistent and has absorbed both prior review cycles' findings: Immutable Rules (§0) now sit above the Product Principles and explicitly encode the "I WANT TO SMOKE" CTA, the user's-own-price rule, and the two-leg payment model. `mvp-scope.md`, `user-stories.md`, and `user-flows.md` all reference the same PRD sections and screen IDs and do not contradict it.

- **[LOW] PRD's own CTA copy example is stale.** §G's journey diagram and §I SCR-16 both still show sentence-case *"Save ₹24 now"*, while the new requirement's literal flow step ("user sees 'SAVE ₹XX'") and the design docs now use uppercase **"SAVE ₹[amount]"**. The design docs already flagged this divergence explicitly rather than silently diverging. Fix: update the two PRD copy examples to uppercase for consistency; no functional impact either way.
- **[LOW] Age-gating has a requirement (§IX.8) and a DB column but still no PRD screen ID.** The design layer filled the gap with an "Age Verification" screen and explicitly flagged it as needing a formal `SCR-xx` backfill from the PRD owner (see `ux-flow.md`). This is now a one-line administrative fix, not an open design question — the screen itself is fully specified.
- **[MEDIUM] Google Sign-In remains unresolved as a scope question.** `mvp-scope.md` item 1 and PRD Functional Requirement 1 specify phone+OTP only. `system-architecture.md`, `security.md` §2.4, and `api-spec.md` (`POST /auth/google`) still fully specify a Google Sign-In path as built. The design layer has now actually *removed* the Google button from the Login/Phone Entry screen spec in this revision — meaning UX has quietly sided with the PRD, while architecture has not been updated to match. This needs an explicit decision (cut it from architecture, or add it to `mvp-scope.md`), not another silent divergence.

## 3. UX Consistency

The design set (`ux-flow.md`, `screen-specifications.md`, `digital-smoking-room.md`, `payment-flow.md`, `quit-wallet.md`, `design-system.md`) has been substantially and carefully reconciled against PRD v1.1 — screen numbering now uses the PRD's own `SCR-xx` IDs directly (the previous "24 vs 32 screens" conflict is resolved: the design set now enumerates 33, i.e., the PRD's 32 plus the Age Verification gap-fill, explicitly reconciled line-by-line in `ux-flow.md`'s revision note). The previously-funneled Craving Intervention Hub is rebuilt as a genuine three-way fork matching PRD Principle 8, the "quick distraction" unaccounted-for fourth option was cut, and the quantity-selection hard cap that made pack-size chips unreachable was fixed.

- **[HIGH] Bottom navigation is specified two different ways in the same design set.** `ux-flow.md` §3 still describes a five-slot bar with a **raised center "SOS" item** ("Home · Wallet · SOS (raised, center) · Progress · Profile") that jumps straight into Craving Check-In, with Coach reached only via a floating entry point — this is the pre-reconciliation nav pattern. `design-system.md` §9, updated in the same revision pass, explicitly **retires** that pattern ("no raised center FAB in this revision... the PRD's actual nav is five plain tabs") and specifies **"Home · Wallet · Progress · Coach · Profile"** with Coach as a real tab, matching PRD §H exactly. These two documents cannot both be right, and the bottom nav is app-shell scaffolding that will be among the first things built. Fix: `ux-flow.md` §3 needs the same one-paragraph correction `design-system.md` already received — this is a doc-sync miss, not a new design decision, since `design-system.md`'s version already matches the PRD.
- **[MEDIUM] `craving_sessions.outcome` enum vocabulary doesn't match the UX/analytics term "abandoned."** See §4 (Architecture Consistency) below — same finding, cross-referenced here because the UX docs are where the term "abandoned" is defined as a distinct, load-bearing third outcome category.
- Everything else — accessibility baseline, motion/reduce-motion fallbacks, tone-of-voice guardrails, the Brand Picker's shared-component treatment across onboarding/craving-moment/settings — is coherent and build-ready.

## 4. Architecture Consistency

`system-architecture.md`, `database-schema.md`, `api-spec.md`, `payment-architecture.md`, and `security.md` all carry explicit revision notes pointing at PRD §L as canonical, and cross-check consistently against each other on the two-leg model, the brand/pricing fix, and the multi-profile fix.

- **[MEDIUM] `craving_sessions.outcome` enum is missing the "abandoned" value the rest of the product depends on.** `database-schema.md` §3.4 lists `'resisted' | 'smoked' | 'simulated_purchase' | 'unresolved'`. But `digital-smoking-room.md` and `analytics.md` (which defines an actual `craving_abandoned` event) both treat **abandoned** as a specific, named, neutral third outcome — distinct from a relapse and distinct from an unresolved/ambiguous state — used when a user exits a breathing exercise or the Digital Smoking Room mid-flow without completing it, and explicitly required to **never affect the streak** the way `'unresolved'` might be interpreted to. Whether `'unresolved'` is meant to *be* "abandoned" under a different name, or whether a coding agent should add a fifth enum value, is not stated anywhere. This is a small schema fix, but it's exactly the kind of ambiguity that produces a real behavioral bug (an abandoned session accidentally affecting streak/progress logic) if a coding agent guesses wrong.
- **[MEDIUM] `analytics.md` (product-owned) has no event for the payout leg.** `system-architecture.md` §10.2 defines `payout_succeeded`/`payout_failed` as new server-emitted events for the two-leg model. `docs/product/analytics.md` — the document PRD explicitly points to as the source of truth for the event taxonomy and KPIs — was not updated with these events, and its own "Wallet trust incidents" KPI (§U) doesn't mention payout failures at all, even though PRD §L.5a treats payout failure as a first-class, user-notified event with its own reversal/refund path. This means the one financial failure mode most unique to this product's architecture currently has no product-level analytics/KPI definition.
- **[LOW] `api-spec.md` §3.1 retains stale either/or language on the OTP verification pattern** ("`{ phone_number, otp_code }` (or `{ firebase_id_token }`)... see security.md §2.1 for which pattern is chosen"), even though `security.md` §2.1 has in fact chosen the Firebase-ID-token pattern definitively. Cosmetic, but worth a one-line cleanup so a coding agent doesn't implement both paths defensively.
- No other cross-document contradictions found. The `PaymentProvider`/`PayoutProvider`/`SavingsLedger` interfaces, the module boundaries in `system-architecture.md` §3.1, and the DB schema's new tables (`savings_destinations`, the payout columns on `payment_transactions`) all agree with each other and with `payment-architecture.md`'s prose description.

## 5. Payment & Savings Consistency

This is the strongest part of the current foundation. PRD §L (canonical), `payment-architecture.md`, `database-schema.md`, and `api-spec.md` describe the identical two-leg model — collection into the platform's merchant account, then an automatic payout to the user's own verified Savings Destination — down to matching field names, idempotency-key sharing between legs (`savings_intent_id`), and identical failure-handling policy (bounded retries → auto-refund-and-reverse, never silent, never indefinite).

- Server-side price computation is now genuinely tied to the user's own `smoking_profiles.cost_per_stick_paise`, snapshotted onto `payment_transactions.unit_price_paise_snapshot` at transaction time, with the admin-managed `cigarette_brand_reference` table explicitly reduced to a names-only autocomplete list with **no price field at all** — this closes the previous review's most severe finding (an admin catalog silently driving real payment amounts) at the schema level, not just in prose.
- Payment success is exclusively server-verified (webhook + polling fallback, never trusted from client return); the ledger write is atomic with the collection-leg status transition; the payout leg is explicitly MVP-required infrastructure, not deferred.
- No CRITICAL or HIGH issues found in this area. The two MEDIUM items in §4 (abandoned-outcome enum, payout analytics) touch this area but are enum/instrumentation gaps, not correctness or safety defects in the money-movement logic itself.
- **[LOW / build-checklist, not a document conflict]** The specific 12-brand seed list given for this build (Gold Flake, Classic, Wills Navy Cut, Four Square, Red & White, Scissors, Bristol, Cavanders, Charminar, Capstan, Advance, Mond Variance) is not yet loaded anywhere as actual `cigarette_brand_reference` seed data — the schema and docs correctly keep this list abstract/admin-managed, so this is a data-seeding task before first release, not a foundation gap.

## 6. Digital Smoking Room Consistency

The end-to-end journey specified in this review's brief —

`Home "I WANT TO SMOKE" → Craving Check-In → Craving Intervention Hub (genuine 3-way fork) → Digital Smoking Room → Brand Selection → Quantity → Amount Confirmation ("SAVE ₹XX") → UPI Payment Handoff → Payment Processing (server-verified) → Ledger write → Quit Wallet update → positive reinforcement`

— is consistently represented across PRD §G/§H/§I, `user-flows.md`, `mvp-scope.md`, `digital-smoking-room.md`, `payment-flow.md`, and `quit-wallet.md`, including the secondary "Open Smoking Room directly" fast path that bypasses the Check-In/Hub for a returning user. The tap-budget and 300ms-per-step performance targets are unchanged and still referenced consistently.

- Brand Selection (SCR-14) specifically satisfies every capability required by this review's brief: usual/preferred brand pre-selected, up to 3 recently-used brands, free-text search across saved profiles and the reference list, an always-visible "I can't find my brand" custom-entry path, pack-price + cigarettes-per-pack entry with live-calculated cost-per-cigarette, a single-stick-only entry mode, and individual-cigarette quantity selection with no artificial low ceiling. This is specified identically in the PRD (§I SCR-14, §N Functional Requirements 2a/2b), `user-stories.md` (US-48–52), `mvp-scope.md` (item 2a), `database-schema.md` (§3.2, §3.3), `api-spec.md` (§3.3), and `digital-smoking-room.md`/`design-system.md` (the new "Brand row" and "Live cost calculator" components). No document tells a materially different version of this screen.
- Immutable Rule 1/2/Principle 4 ("never a marketplace") is enforced consistently and specifically at every layer that touches brand selection: no logos/images in the DB schema's `cigarette_brand_reference`, no pricing on that table, no product-grid layout in the design spec, explicit "never a storefront" microcopy guardrails.
- No CRITICAL, HIGH, or MEDIUM issues found specific to this flow beyond the abandoned-outcome and payout-analytics items already listed in §4, which apply here as elsewhere.

## 7. Brand Selection Consistency

Covered in detail in §6 above (the feature itself). Separately, on **brand identity** (the app's own name/voice, not the cigarette brand picker): `brand/brand-strategy.md` and `brand/app-store-branding.md` are unchanged from the previous review, and per project memory that is correct — their central promise ("keep the money," "your pocket, not the packet," "an urge, ₹ in your pocket") is now **literally true** under the resolved two-leg payout model, where it was previously false under the (now-superseded) platform-revenue model. No brand rework is needed. No inconsistency found between brand voice and the current product/technical model.

## 8. Security Issues

No new security issues found beyond what the architecture set already documents and mitigates (server-side price computation, payout-beneficiary verification via penny-drop/VPA match before any payout can target it, idempotency at every money-movement layer, refresh-token rotation with reuse detection, DPDP-aligned consent/export/deletion). Two items carried forward, both already noted above:

- **[MEDIUM]** Google Sign-In (§2) is a live auth surface in `security.md` with no corresponding product sign-off — an unresolved scope question, not a vulnerability, but worth closing before building it.
- **[LOW]** The OTP-verification-pattern hedge in `api-spec.md` (§4) should be cleaned up so there's exactly one documented pattern, matching `security.md`.

No CRITICAL or HIGH security findings.

## 9. Remaining Conflicts

| # | Issue | Severity | Where |
|---|---|---|---|
| 1 | Bottom navigation specified two incompatible ways (raised "SOS" center item + floating Coach vs. five equal tabs including Coach) | **HIGH** | `design/ux-flow.md` §3 vs. `design/design-system.md` §9 |
| 2 | Google Sign-In built in architecture/security/API, absent from PRD's MVP scope, now also dropped from the UX Login screen — three-way disagreement | **MEDIUM** | `docs/architecture/system-architecture.md`, `security.md` §2.4, `api-spec.md` §3.1 vs. `docs/product/mvp-scope.md` item 1 vs. `design/screen-specifications.md` SCR-03 |
| 3 | `craving_sessions.outcome` enum has no `'abandoned'` value; UX/analytics treat "abandoned" as a specific, named, streak-neutral outcome | **MEDIUM** | `docs/architecture/database-schema.md` §3.4 vs. `design/digital-smoking-room.md`, `docs/product/analytics.md` |
| 4 | No `payout_succeeded`/`payout_failed` event (or equivalent KPI) in the product-owned analytics doc, despite payout failure being a first-class, user-notified new failure mode | **MEDIUM** | `docs/product/analytics.md` vs. `docs/architecture/system-architecture.md` §10.2, PRD §L.5a |
| 5 | PRD's own SCR-16/§G copy examples still show sentence-case "Save ₹24 now" instead of the now-required uppercase "SAVE ₹[amount]" | **LOW** | `docs/product/PRD.md` §G, §I SCR-16 vs. `design/digital-smoking-room.md` |
| 6 | Age Verification screen fully designed but has no formal PRD `SCR-xx` ID | **LOW** | `docs/product/PRD.md` §H/§I vs. `design/ux-flow.md` |
| 7 | Stale either/or OTP-pattern language in the API spec after security.md already resolved it | **LOW** | `docs/architecture/api-spec.md` §3.1 |
| 8 | 12-brand seed list from this brief not yet loaded as `cigarette_brand_reference` data | **LOW** (build task, not a doc conflict) | n/a — execution item |

No CRITICAL conflicts found in this pass.

## 10. Required Changes Before Coding

In priority order:

1. **[HIGH]** Fix `design/ux-flow.md` §3 to match `design-system.md` §9's bottom nav (five equal tabs: Home · Wallet · Progress · Coach · Profile — no raised center item). One paragraph.
2. **[MEDIUM]** Decide Google Sign-In's MVP status. Either remove `POST /auth/google` and the Google auth architecture from `system-architecture.md`/`security.md`/`api-spec.md`, or add it explicitly to `mvp-scope.md` item 1 and restore it to the Login screen spec. Do not leave architecture and UX quietly disagreeing.
3. **[MEDIUM]** Add `'abandoned'` to `craving_sessions.outcome` in `database-schema.md` §3.4 (or explicitly document that `'unresolved'` means the same thing and rename it for clarity) — confirm streak/progress logic treats it as neutral, not penalizing.
4. **[MEDIUM]** Add `payout_succeeded`/`payout_failed` events to `docs/product/analytics.md` §T, and add a payout-failure-rate line to the KPI section (§U), matching what `system-architecture.md` already assumes exists.
5. **[LOW]** Update PRD §G/§I SCR-16 copy examples to uppercase "SAVE ₹[amount]" for consistency with the design set and the new requirement.
6. **[LOW]** Backfill a formal `SCR-xx` ID for Age Verification in the PRD's own §H/§I.
7. **[LOW]** Clean up the stale OTP-pattern hedge in `api-spec.md` §3.1.
8. **[Execution, not a doc fix]** Load the 12-brand seed list into `cigarette_brand_reference` before first internal build/QA pass.

None of the above require a design meeting or a new product decision except #2 (Google Sign-In), which is a five-minute call, not a re-scope.

## 11. MVP Build Recommendation

Begin implementation. The core financial model, the Digital Smoking Room's brand-selection mechanics, and the database/API/security layers are consistent, specific, and safe to build against as written. Sequence the work so that:

- The **app shell (navigation)** isn't started until item 1 above is resolved (it's a five-minute fix; don't let it block anything else).
- The **auth module** isn't started until item 2 is resolved, to avoid building a Google Sign-In path that then has to be ripped out or the reverse.
- The **craving-session/streak logic and analytics instrumentation** pick up items 3–4 as part of their own implementation, not as a follow-up patch — both are cheap to get right now and expensive to reconcile later once real data exists in a shape that doesn't match the eventual schema/event names.

Everything else — the Digital Smoking Room core loop, the two-leg payment/payout architecture, the Quit Wallet, the AI Craving Coach, security/DPDP compliance, and the brand — is ready to build against today.

---

## BUILD CHECKLIST

Must be true before coding begins on the affected surface:

- [ ] `design/ux-flow.md` §3 updated to the five-equal-tab bottom nav (matches `design-system.md` §9) — **before app-shell/navigation code**
- [ ] Google Sign-In MVP status explicitly decided and all three of `mvp-scope.md`, the architecture docs, and the UX Login screen agree — **before auth module code**
- [ ] `craving_sessions.outcome` enum includes (or is confirmed to already cover) an `'abandoned'` value, and streak/progress logic is confirmed neutral on it — **before craving-session/streak code**
- [ ] `docs/product/analytics.md` includes `payout_succeeded`/`payout_failed` events and a payout-failure KPI — **before analytics instrumentation code**
- [ ] PRD §G/§I SCR-16 copy examples updated to uppercase "SAVE ₹[amount]" — **before final copy/string-resource lock, not a hard blocker**
- [ ] Age Verification given a formal PRD `SCR-xx` ID — **administrative, not a blocker**
- [ ] `api-spec.md` §3.1 OTP-pattern language cleaned up to state the Firebase-ID-token pattern only — **administrative, not a blocker**
- [ ] `cigarette_brand_reference` seeded with the 12-brand initial list — **before Brand Picker QA/demo**
- [ ] No CRITICAL conflicts open (confirmed true as of this review)
