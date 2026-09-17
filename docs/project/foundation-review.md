# Foundation Review

Reviewed: `docs/product/*`, `docs/architecture/*`, `design/*`, `brand/*` (all files present as of this review). Written by the lead reviewer, not by any of the four authoring agents. Nothing in the source documents has been edited as part of this review — conflicts are reported, not resolved.

> **Resolution update (post-review)**: the product owner has explicitly decided **`docs/product/PRD.md` is the canonical, governing document for this project**, overriding this review's §4.1 recommendation to build toward the architecture's platform-revenue model instead. The PRD's route-through model is retained, and has been made concrete and technically specific (a two-leg collect-then-payout mechanism, PRD §L.1) precisely to address this review's underlying technical objection — that "the payment routes to the user's own account" was under-specified and risked looking like an unworkable same-person payer/payee UPI flow. It no longer is: collection and payout are two separate, standard PA capabilities (UPI collection + a Payout API), linked by one idempotency key, and the same-account "round trip" case this review worried about is now an explicitly flagged residual risk (PRD §L.13, §VIII risk table — "PA rejects the use case"), not a hidden one.
>
> Status of each conflict below:
> - **§2.A (financial model)** — **resolved.** PRD wins. `docs/architecture/payment-architecture.md`, `database-schema.md`, `api-spec.md`, `system-architecture.md`, and `security.md` have all been rewritten to match (see each file's own "Revision note"). `docs/product/PRD.md` §L is the single source of truth for the money flow going forward.
> - **§2.B (pricing source)** — **resolved.** `payment_transactions` now derives `amount_paise` from the user's own `smoking_profiles.cost_per_stick_paise`, snapshotted at transaction time. The old `simulated_products` catalog is repurposed as a price-less `cigarette_brand_reference` autocomplete list only.
> - **§2.C (multiple profiles)** — **resolved.** `UNIQUE(user_id)` removed from `smoking_profiles`; multiple profiles per user with an `is_primary` flag are now supported end-to-end (schema, API, PRD were already aligned — only the schema was wrong).
> - **§2.K (ledger interface redemption drift)** — **resolved as a side effect**: there is no redemption path at all now, so the interface/schema drift this item flagged no longer has anything to drift on.
> - **§2.D, §2.E, §2.F, §2.G, §2.H, §2.I, §2.J — still open.** These are `design/*` (UX) and a couple of minor architecture-doc issues, not `docs/architecture/*` financial-model issues, and were out of scope for this pass (which focused on making the PRD canonical and correcting the money flow specifically). The design docs (`ux-flow.md`, `screen-specifications.md`, `digital-smoking-room.md`, `payment-flow.md`, `quit-wallet.md`) and the brand docs still need a reconciliation pass against the now-canonical PRD — brand copy ("your pocket," "money kept") is actually *validated* by this resolution rather than contradicted, since it was written against the PRD's model, but the design docs (built against the architecture's now-superseded model, per §2.A above) still show a redemption/voucher flow that must be removed and a payment/wallet UX that must be redrawn to match the two-leg model. Treat this as a distinct, not-yet-started follow-up task.

---

## 1. What is ready

- **Product spec (PRD, user-flows, user-stories, mvp-scope, analytics)** is unusually disciplined: every screen has states/errors/nav specified, acceptance criteria exist for the core loop, and the MVP-cut test ("does removing this break the core loop or its trust/legality?") is a genuinely useful scoping tool. Principles 1–8 are specific enough to be testable, not just vibes.
- **Database schema and payment architecture** (as an internally-consistent unit) are production-grade: append-only ledger, triple-layer idempotency (client key, provider event ID, DB unique constraint), documented reconciliation job, atomic ledger-write-with-status-transition, and a clear provider-agnostic interface. This is the strongest single artifact in the set.
- **Security architecture** covers the right ground for this app's actual risk profile (OTP/JWT rotation with reuse detection, DPDP Act 2023 mapping, tokenized payment data, fraud/velocity controls) without over-building.
- **Design system and screen specs** are detailed to build-ready depth (states, accessibility, motion, reduce-motion fallbacks, tone-of-voice guardrails against shaming). The three-zone emotional-color system is a genuinely good translation of the product thesis into visual language.
- **Self-awareness**: to their credit, the design docs (`payment-flow.md`, `quit-wallet.md`, `design-system.md`) already identified and flagged the single biggest conflict in this project (see §2.A) rather than silently picking a side and hiding it. That flag is the reason this review can be specific rather than exploratory.
- **Brand naming rationale** (Jeb) is well-argued and the visual identity has already been mechanically threaded into the design system tokens — that hand-off worked cleanly.

None of the above is safe to build against until §2.A is resolved, because it changes what several of these "ready" documents actually mean in production.

---

## 2. Conflicts found

### A. [CRITICAL] Two incompatible financial models — and the brand promises a third thing

- **`PRD.md` §L**: route-through, non-custodial. Every payment settles into a bank account/VPA **the user themselves controls** ("Savings Destination," set up in onboarding). The platform never holds the money. Explicitly: **no withdrawal flow, because none is needed** (§L.8) — the money never left the user's own ecosystem. `mvp-scope.md` §S calls a withdrawal screen "building for a custody model the product doesn't have."
- **`payment-architecture.md` §1**: platform-revenue model. The payment is collected by the platform as **merchant of record**; money settles into the **platform's own current account** and becomes **platform revenue**, not the user's money. The "Savings Ledger" is a behavioral bookkeeping construct. MVP redemption is limited to `voucher` and `donation` (spending the platform's own revenue as a reward); actual cash back to the user (`bank_payout`) is explicitly **Phase 2**, gated on a licensed banking/PPI partnership that does not exist yet.
- **The design docs correctly identified this and picked the architecture's model**, flagging it in three places (`payment-flow.md`, `quit-wallet.md`, `design-system.md`) as an unresolved conflict they resolved one way "since it's the more recent, more technically-considered version."
- **The brand docs were written against the PRD's model and were never reconciled to the architecture's model.** `brand-strategy.md`'s winning positioning for "Jeb" (the shipped name) is built entirely on literal possession of money: *"turns every craving into cash you keep,"* *"redirecting that money into your pocket instead,"* *"I kept ₹840 this week,"* tagline *"Your pocket. Not the packet."* The app-store copy repeats this: *"Beat the craving. Keep the money,"* *"12 urges beaten. ₹2,840 kept."* **None of this is true under the architecture's actual model** — under that model, the user's money becomes platform revenue and the user gets a voucher or a donation-in-their-name, not "money in their pocket." If shipped with the architecture's model and this brand copy, this is not just an internal inconsistency — it's a materially misleading product claim to a financially vulnerable user population, and plausibly a consumer-protection/advertising-standards problem in India, not only a UX one.
- **This is the single highest-leverage decision in the entire project.** It determines: which onboarding screens exist (Savings Destination vs. none), whether a redemption/voucher system needs to be built at all, what the database schema's redemption tables need to look like, what the ToS can legally say, what the brand can honestly claim, and what `mvp-scope.md` should actually list as MVP.

### B. Smoking Room pricing model doesn't match the product spec's own personalization promise

- PRD/UX: the Smoking Room shows the **user's own saved smoking profile(s)** (self-reported brand label, self-reported price-per-stick) — this is explicitly why the product feels honest ("match the amount to what I'd actually have bought," US-22).
- `database-schema.md` §3.3/§3.5: the actual payment amount is computed as `simulated_products.reference_price_paise × quantity` — an **admin-managed generic catalog**, not the user's own reported price. `payment_transactions.product_id` references this catalog; there is no field anywhere linking a payment to the user's `smoking_profiles` row.
- Net effect as currently spec'd: **the amount a user actually pays would not reflect their own reported cigarette price at all** — it would reflect whatever an admin set in a shared catalog. This silently breaks the core mechanic ("mirrors your normal spend") and the API example payload (`"description": "Redirected spend — 1x Simulated Pack"`) reads like generic catalog checkout copy, not a personalized reflection screen.

### C. Multiple smoking profiles required by product, forbidden by schema

- PRD Functional Requirement 2, `mvp-scope.md` item 2, US-04, and SCR-05/SCR-29 all require support for **multiple** smoking profiles per user ("not deferred... single-stick/multi-brand purchasing is core to the target user"). UX design's Product Selection screen also assumes up to 3.
- `database-schema.md` §3.2: `smoking_profiles` has `CONSTRAINT smoking_profiles_user_unique UNIQUE (user_id)` — **the schema allows exactly one profile per user.** As written, the DB structurally cannot support a stated MVP requirement.

### D. Craving Intervention Hub: PRD says fork, UX design built a funnel

- PRD Principle 8: "The craving path is a fork, not a funnel" — the Smoking Room must be one of the intervention hub's **equal-weight options**, "never blocked... by a mandatory coaching step." This is also a stated Acceptance Criterion (§X): the user must be able to reach the Room "without being forced through any of the others first."
- UX design's Screen 19 (`digital-smoking-room.md`): three equal-weight cards are **breathing / quick distraction / AI coach**. The Smoking Room is demoted to a "lower-emphasis... text button pinned near the bottom" under the heading "Still craving?" — structurally a funnel toward coping tools first, exactly the pattern Principle 8 rules out.
- Compounding this: PRD's secondary Home CTA, **"Open Smoking Room directly"** (US-12, required by `mvp-scope.md` item 5, tested in Acceptance Criteria) — which exists specifically so a user who's already decided doesn't have to go through the check-in/hub at all — does not appear anywhere in the UX Home screen spec (Screen 5) or Craving CTA spec (Screen 7). As designed, every path to the Smoking Room currently runs through the Intervention screen.
- Also note: "Quick distraction" is a UX-design addition not present in the PRD's three defined intervention paths (breathing / AI coach / Smoking Room) and has no corresponding analytics event in `analytics.md`'s `intervention_path_selected` enum (`breathing`/`ai_coach`/`smoking_room`/`relapse_log` only).

### E. Craving intensity/trigger capture has no screen in the UX design

- PRD's SCR-10 (Craving Check-In) is a distinct, required step that captures intensity and trigger tag before the Intervention Hub, and both `analytics.md`'s `craving_intensity_logged` event and `craving_sessions.intensity`/`trigger` DB columns depend on it existing.
- UX design's Screen 19 (the merged "Craving Intervention") has no intensity slider or trigger-tag UI at all in its spec. As designed, there's no screen that actually produces the data those DB columns and analytics events expect.

### F. Screen inventory mismatch: 32 screens vs. 24 screens

- PRD's Information Architecture (§H) specifies **32 screens**, SCR-01 through SCR-32, including several the UX/design docs don't have at all or have merged: separate Onboarding Carousel + Phone Entry + OTP Verification (PRD: 3 screens) vs. UX's single combined Login/Signup (1 screen); Savings Destination Setup (SCR-07) and its Settings counterpart (SCR-30) don't exist in the UX inventory at all (a casualty of the financial-model conflict in §A, but not reconciled); Cigarettes Avoided Detail (SCR-26) has no UX counterpart; Account & Privacy (SCR-31) and Help & Support (SCR-32) are folded into a single generic Profile/Settings screen.
- UX design explicitly organizes around a fixed "24 requested screens" inventory (`ux-flow.md` §5, `quit-wallet.md`'s redemption sheet is described as "not one of the 24 requested screens"), implying a different originating brief than the PRD's own IA. **These two documents do not describe the same app's screen count**, and it isn't just naming — functionality is missing or merged, not just renamed.

### G. Quantity cap contradicts the product's own quick-select chips

- PRD SCR-15 / `user-flows.md` §3.2: quick-select chips are "1, 2, 5, and the user's pack size (if set in their profile)" — explicitly designed to cover "one stick right now" through "a full pack," with pack sizes of 10 or 20 as set in Smoking Profile Setup.
- UX design's Quantity Selection (Screen 10): hard range of **1–5**, with a 6th tap blocked and reframed as "that's a lot for one craving." This makes the PRD's own "pack size" chip (10/20) impossible to select in the UX as built.

### H. Age-gating required, but no screen collects it

- PRD §IX.8 requires self-declared age-gating at onboarding; `database-schema.md` has a `date_of_birth` column specifically for this; `security.md` §2.1 describes server-side rejection of under-18 dates.
- Neither the PRD's 32-screen inventory nor the UX's 24-screen inventory has an onboarding step that actually collects date of birth. `PATCH /users/me` in `api-spec.md` can update it "once, if not already age-verified" — implying it's set somewhere — but no screen spec shows where.

### I. Google Sign-In: built in three architecture docs, absent from product scope

- `system-architecture.md`, `security.md` §2.4, `api-spec.md` (`POST /auth/google`), and UX Login/Signup (Screen 3) all specify a Google Sign-In path as a real, built feature.
- PRD Functional Requirement 1 and `mvp-scope.md` item 1 specify **phone + OTP only** for MVP; Google Sign-In appears nowhere in the product spec's MVP scope. This is scope that crept in at the architecture/design layer without a corresponding product decision — worth a deliberate call, not a silent build.

### J. Minor: OTP verification pattern left ambiguous in one document

- `security.md` §2.1 clearly specifies Firebase ID token verification. `api-spec.md` §3.1 still hedges: `{ phone_number, otp_code }` **or** `{ firebase_id_token }`, "see security.md §2.1 for which pattern is chosen" — the decision was made in one doc but not back-filled into the other. Low severity, easy fix, flagged for completeness.

### K. Minor: ledger interface doesn't model the redemption debit path it needs

- `database-schema.md`'s `savings_transactions.source_type` includes `'goal_redemption'` as a valid value. `payment-architecture.md`'s `RecordSavingsInput.sourceType` interface only types `'payment' | 'admin_adjustment'`. Redemption debits (§4.4, `redeem()`) are handled outside this interface entirely — not a bug exactly, but the two documents describe the ledger's write paths slightly differently, and this is exactly the kind of drift that produces a real bug once someone codes against one document without the other.

---

## 3. Decisions that need to be made

These block implementation and are explicitly **not resolved by this review** — they're business/legal/product calls, not engineering ones.

1. **Financial model (§2.A)** — route-through-to-user's-own-account vs. platform-revenue-with-voucher/donation-redemption vs. a third option not yet on paper. This needs a lawyer's opinion on the PA relationship and RBI exposure before either PRD or architecture is treated as final, and it must be signed off by whoever owns the "Jeb" brand promise, not just engineering.
2. **Smoking Room pricing source (§2.B)** — does the payment amount come from the user's own reported price (personalization) or a shared catalog (simpler to build, breaks the core promise)? If personalization wins (it should, per the product thesis), `payment_transactions` needs a `smoking_profile_id`/price snapshot, not (or in addition to) `product_id`.
3. **Single vs. multiple smoking profiles (§2.C)** — a straightforward schema fix once decided, but decide explicitly since it's currently contradictory, not just under-specified.
4. **Is the Intervention Hub a fork or a funnel (§2.D)?** — this is a product-values question (Principle 8 vs. the UX team's read of it), not a visual design question. Needs explicit resolution, since the current UX build materially changes user experience from what the PRD promises and tests for.
5. **Final screen count/IA (§2.F)** — 24 or 32, and which specific screens are cut, merged, or added. Whoever owns the product brief that specified "24 screens" needs to reconcile it with the PRD's IA directly.
6. **Is Google Sign-In in MVP (§2.I)?**

---

## 4. Recommended resolutions

Offered as the reviewer's opinion, not a decision — all five need explicit sign-off from whoever owns product/legal risk, not silent adoption by whichever team builds first.

1. **Financial model**: build toward the **architecture's platform-revenue model**, not the PRD's route-through model. The PRD's model reads as *simpler* on paper but actually has the *worse* practical hole: "route the payment to the user's own account" via a PA is not a wallet-license workaround so much as it's a fragile use of standard payment rails for something they're not really built for (a same-person payer/payee UPI collect flow is exactly the kind of thing PAs flag or reject — the PRD's own Risk table names this). The architecture's model is boring, legally cleaner, and already has a real (if limited) MVP redemption story. **But this only works if the brand and every user-facing sentence about "your money"/"your pocket" is rewritten before launch** — "Jeb" as a name and positioning is currently a liability under this model, not just copy that needs a tweak. That's a brand-strategy conversation, not a find-and-replace.
2. **Smoking Room pricing**: use the user's own `smoking_profiles.cost_per_cigarette_paise`, snapshotted onto the payment transaction at the moment of purchase (so later profile edits don't retroactively change historical ledger entries). Drop or repurpose `simulated_products` as a fallback/default price table for users who haven't set a profile yet, not as the primary pricing source.
3. **Multiple profiles**: keep it — it's a well-justified MVP requirement (single-stick culture, multi-brand reality), and the schema fix (drop the unique constraint, add a `label`/`is_default` field) is trivial compared to the value of keeping it.
4. **Intervention Hub**: follow the PRD's Principle 8 literally — make the Smoking Room a fourth equal-weight card, not a demoted link. The UX team's instinct (make the user genuinely consider alternatives) is reasonable, but the PRD is explicit and testable here, and this exact tension (help vs. friction) is the one place in this product where the brief overrides UX's normal instincts.
5. **Screens**: treat the PRD's 32-screen IA as canonical (it's more complete and was derived from the same brief the UX doc's "24 requested screens" apparently also came from, but the PRD's is more internally consistent with its own functional requirements) and have the UX team reconcile against it screen-by-screen, not the reverse.

---

## 5. MVP must-have

Unchanged from `mvp-scope.md`'s own reasoning — it's sound and this review doesn't second-guess it:

- Phone + OTP auth, one or more smoking profiles, motivation/goal capture, Craving Check-In → Intervention Hub (as a true fork) → Digital Smoking Room, real UPI payment via a licensed PA with full idempotency/verification/ledger-write chain, Quit Wallet with balance/history, relapse logging, core settings, reconciliation job, Hindi + English, age-gating.
- **Add explicitly, once §2.A resolves toward the architecture's model**: the voucher/donation redemption flow (`quit-wallet.md`'s redemption sheet) becomes load-bearing MVP, not an optional nicety — without it, a credited ledger balance is a number the user can never actually turn into anything, which breaks trust worse than not having the feature at all.

## 6. MVP should-not-have

- **Google Sign-In** (§2.I) — not in the product brief's MVP scope; cut it or get an explicit product decision to add it.
- **"Quick distraction" as a fourth intervention option** (§2.D) — not in the PRD's three-path design, adds a card without a corresponding analytics event or product rationale; fold into breathing/AI coach or cut.
- Multiple concurrent savings goals, proactive pattern-based notifications, social sharing, richer AI coach memory — already correctly deferred to V1/Future by `mvp-scope.md`; this review agrees and flags them only to confirm no scope creep has occurred elsewhere (it hasn't, apart from the two items above).
- Full pack-size quantities (10/20) in the Smoking Room **if** the 1–5 cap (§2.G) is kept intentionally rather than by oversight — worth a deliberate "is a pack-sized single redirect a real use case" call rather than leaving the contradiction as-is.

## 7. Technical blockers

- §2.A (financial model) blocks: `payments/` module design, `ledger/` module design, onboarding screen set, Settings screen set, and the database migration plan — nothing in `payments/`/`ledger/` should be coded until this is resolved, since the two candidate models have different tables, different endpoints, and different screens.
- §2.B/§2.C (pricing source, multi-profile schema) block `payments/` and `smoking-profile/` module implementation — the current schema cannot support the stated product requirement as written.
- PA vendor selection and sign-off (PRD §L.13, flagged there as "a compliance/legal question, not a research question") is unresourced — settlement timing (T+0/T+1), whether the chosen PA even supports the eventual model's settlement pattern, and KYC requirements are all still open. This gates real payment testing, not just launch.
- No decision yet on `bank_payout`/Phase 2 banking partnership timeline — irrelevant to MVP build but relevant to whether the architecture's "Phase 2" framing is realistic, which affects how honestly the product can market a future roadmap.

## 8. Payment blockers

- The core financial model is legally unresolved (§2.A) — no payment code should touch real money until a lawyer has signed off on whichever model is chosen, per both `payment-architecture.md`'s own instruction ("get one before going live with real money") and the PRD's Risk table (regulatory misclassification as a PPI issuer).
- PA vendor conversation about the "pay-to-not-buy-cigarettes" use case has not happened — both PRD (§VIII risk table) and `payment-architecture.md` flag this as a real possibility (PAs underwriting a novel same-person-payer/payee or "commitment device" flow), and it's not just a formality — the whole product depends on a PA accepting this use case.
- If the architecture's model is chosen: the voucher/donation partner catalog (real partners, real inventory, real charity relationships) does not exist yet and is a build/business dependency the docs point at but don't own.
- Terms of Service reflecting whichever model is chosen does not exist yet — every screen that shows a "savings" figure depends on ToS language matching the actual legal relationship.

## 9. UX blockers

- Intervention Hub structure (§2.D) needs a decision before its screen can be finalized — its whole layout (equal-weight cards vs. one demoted link) changes depending on the answer.
- Missing intensity/trigger-capture UI (§2.E) needs to be added back in or the corresponding DB columns/analytics events need to be formally cut — currently a data model with no producing screen.
- Screen inventory reconciliation (§2.F) blocks final navigation/IA sign-off.
- Everything else in the UX set (accessibility, motion, tone, localization posture) is in good shape and not blocking.

## 10. Final build readiness

**NOT READY.**

The individual documents are each strong, but the single most load-bearing decision in the product — what actually happens to the user's money — is answered two incompatible ways by the product spec and the technical architecture, and the brand's core promise ("keep the money," the app's own name) currently matches neither answer cleanly and actively contradicts one of them. This isn't a polish issue; it determines the database schema, the screen set, the legal review, and whether the app's marketing is honest. Three secondary but real contradictions (Smoking Room pricing source, multiple-profile support, and the Intervention-Hub fork-vs-funnel question) sit directly in the core loop the whole product is built around, and a fourth (24 vs. 32 screens) needs a straightforward but currently-skipped reconciliation pass.

Resolve §2.A through §2.C and §2.D at minimum — with explicit product/legal sign-off, not an engineering judgment call — before any code is written against `payments/`, `ledger/`, `smoking-profile/`, or the onboarding/Settings screens. The rest of the foundation (security, most of the UX/design system, analytics taxonomy, deployment plan) can proceed in parallel since it doesn't depend on the outcome.
