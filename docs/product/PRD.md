# Product Requirements Document — Digital Smoking Room
### India-first Android smoking cessation app

Status: Build-ready draft v1.1 — **canonical / governing document for this project**
Owner: Lead PM (this document)
Related docs: [user-flows.md](./user-flows.md) · [user-stories.md](./user-stories.md) · [mvp-scope.md](./mvp-scope.md) · [analytics.md](./analytics.md)

> Source of truth: this PRD is derived entirely from the product brief supplied for this project. No market-sizing, competitor, or user-research claims are asserted here beyond what was given — where a figure or fact would normally come from research (market size, competitor names, willingness-to-pay data), it is deliberately omitted rather than invented. Domain facts that are stable public knowledge (UPI as India's real-time payment rail, RBI's PPI/Payment Aggregator regulatory framework, the DPDP Act 2023, Android being the dominant OS in India) are used only to make the spec technically and legally sound, not as research findings.

> **This document governs.** A parallel architecture effort (`docs/architecture/`) was built against a different, incompatible financial model — the platform collecting "save" payments as its own revenue and disbursing rewards (vouchers/donations) rather than the user's own money. **That model is rejected.** §L below is the single, corrected, and now-authoritative description of the money flow — provider-agnostic in principle, but specific enough about the mechanics (two-leg collect-then-payout) to be implementable without reinterpretation. Any other document in this repository (architecture, design, brand) that describes the money flow differently is stale and must be brought into line with this section, not the other way around.

---

## 0. Immutable Rules

These ten rules sit above every other section of this document, including the Product Principles (§F). Nothing built for this product — no feature, screen, prompt, or architectural shortcut — may violate any of them. Where any other document (architecture, design, brand, or a future addition to this PRD) appears to conflict with one of these, the rule wins and the other document is wrong.

1. **The Digital Smoking Room is a behavioral simulation.** Brand/cigarette "selection" exists to mirror what the user would have spent — it is never a product catalog, storefront, or purchase flow of any kind.
2. **The app never sells tobacco.** No screen, copy, image, or integration may facilitate, broker, or route toward the purchase, delivery, or sale of a real tobacco product, to anyone, ever.
3. **Use the user's own cigarette price.** The amount shown and charged in the Smoking Room is always computed from the user's own `smoking_profiles` data (brand, price, quantity), never from an admin-managed or third-party price list.
4. **"I WANT TO SMOKE" is the primary CTA.** This is the main entry point on Home into the craving flow — stated plainly, not softened, because naming the urge honestly is the point (see §F Principle 2, no shame — honesty about the urge and shame about a relapse are different things).
5. **Every redirected payment updates Quit Wallet.** A confirmed save is never left unreflected in the balance the user sees — see §L.5's atomicity requirement between payment confirmation and the ledger write.
6. **Quit Wallet represents redirected savings.** It is a ledger of the user's own money that was redirected from a cigarette purchase to their own account (§L.1) — never platform revenue, never a claim on funds the platform holds, never a rewards/points balance.
7. **The backend always verifies payments.** No screen renders a success state, and no ledger entry is written, on the strength of a client-side claim alone — success is determined server-side against the payment provider's authoritative record (§L.4).
8. **The MVP is Android-first and India-first.** UPI-native payment, ₹ currency, Hindi + English, single-stick pricing as a first-class case — not a generic template with India as one configuration among many.
9. **AI supports cravings; it does not give medical treatment.** The AI Craving Coach offers conversational, non-clinical support and a crisis-escalation path — it never diagnoses, prescribes, or claims a treatment outcome (§IX.1–3).
10. **Every new feature must strengthen the craving → save → reward loop.** If a proposed feature doesn't make that loop faster, more trustworthy, or more motivating, it does not belong in this product regardless of how good an idea it is on its own — this is the scope test already applied in [mvp-scope.md](./mvp-scope.md) and should be applied to every future addition, not just the current scope cut.

---

## A. Product Vision

Turn the exact moment a smoker reaches for money to buy a cigarette into the moment they get richer instead. The Digital Smoking Room preserves the *ritual* of the purchase — the thing smokers actually reach for under craving — and redirects its money and reward to the smoker's own future, one cigarette-sized transaction at a time.

## B. Target User

- Adult smokers in India who buy cigarettes **by the stick**, not only by the pack — the dominant retail pattern at paan/cigarette shops in India, and the reason per-cigarette quantity selection is a first-class product mechanic, not a pack-only toggle.
- Android users, since Android is the dominant mobile OS in the India smoker demographic this product targets. Devices span flagship to entry-level; the app must stay light and tolerant of patchy connectivity.
- UPI-active users — comfortable initiating a UPI payment (GPay/PhonePe/Paytm/BHIM or a linked bank UPI app), because the core mechanic depends on that being as fast and familiar as buying a cigarette.
- Smokers who are **craving-driven quitters**: motivated to cut down or quit but who relapse repeatedly at the moment of craving, not from lack of long-term intent. They are not necessarily engaging with a clinic, a doctor, or NRT (nicotine replacement therapy) — this app may be their only cessation touchpoint.
- Price-sensitive users for whom seeing money accumulate is a tangible, legible motivator — more concrete than an abstract health message.

## C. Core Problem

The moment a craving hits, the smoker's default path to relief is fast, cheap, and physically close (a shop within a few minutes' walk). Cessation tools that rely purely on willpower, information, or delayed rewards (health improves "over weeks") lose to that speed. There is no existing action that is **as fast as buying a cigarette** but that results in the smoker being better off. The product problem is not "convince the smoker cigarettes are bad" — that knowledge is already present in most smokers who are trying to quit. The problem is **what does the smoker do in the 30–90 seconds after the craving hits**, before the nearest shop.

## D. Product Thesis

For a habitual smoker, part of the craving is the *ritual of the transaction itself* (walking, paying, holding, lighting) — not only the nicotine. If the app can intercept the transaction step specifically, and make paying-into-savings **at least as fast and satisfying as paying-for-a-cigarette**, it can substitute for the purchase ritual without requiring the smoker to win a willpower contest against the craving. Real money movement (not points or a mock "saved ₹" counter) is essential: the reward has to be as real as what was given up, or the substitution won't feel like a fair trade to the user and won't sustain repeated use.

## E. Core Value Proposition

**"Every cigarette you skip, you get richer — instantly, and you can see it."**

- To the smoker mid-craving: an action just as fast as buying a cigarette, but the money stays yours.
- To the smoker after a week: a visible, real, spendable pool of money that only exists because they didn't smoke — proof of progress that isn't abstract.
- To the smoker choosing between craving paths: a legitimate off-ramp (AI coach, breathing, distraction) for the cravings that aren't really about the cigarette at all.

## F. Product Principles

1. **Speed beats willpower.** The Digital Smoking Room flow (open → select → confirm → pay → confirmation) must be completable in well under the time it takes to walk to a shop and buy a cigarette. Every added screen, form field, or confirmation dialog is a defection risk. Optimize ruthlessly for taps and latency in this flow above all other flows in the app.
2. **No shame, ever.** Relapse is expected and will happen to most users repeatedly. Relapse logging, streak resets, and any "you failed" moment must be written and designed with neutral, compassionate language. No red "X", no guilt copy, no shaming notifications.
3. **The money has to be real.** No points, coins, badges-as-currency, or notional-only "you would have saved ₹X" language once a payment has actually happened. Real UPI payment → real savings ledger entry. Gamification (streaks, milestones, badges) is allowed *on top of* real money, never instead of it.
4. **Never touch tobacco commerce.** No screen, copy, icon, or flow may facilitate, resemble, or imply the purchase, delivery, or sale of tobacco products. Cigarette "selection" in the Smoking Room is a **behavioral parameter picker** (what you normally smoke, so we can mirror your normal spend) — it must never look or behave like a product catalog, cart, or checkout for tobacco.
5. **India-first, not India-adapted.** UPI-native payment, single-stick pricing as a first-class unit, Hindi and English in MVP, and performance budgets that respect entry-level Android hardware and inconsistent connectivity.
6. **Progress must be visible in two taps.** Streak, cigarettes avoided, and money saved must be visible within two taps of opening the app, every session.
7. **Consent over money, every time.** The user must see exactly what will happen to their money (amount, destination) before every payment confirmation. No stored-preference "auto-pay" in MVP; every Smoking Room payment is explicitly confirmed per transaction.
8. **The craving path is a fork, not a funnel.** A user hitting "I WANT TO SMOKE" is never forced through an upsell-style intervention before reaching the Smoking Room, and never blocked from the Smoking Room by a mandatory coaching step. Coaching/intervention is offered as a genuine alternative, not a gate.

---

## G. Complete User Journey (summary)

Full step-by-step flow, screen-by-screen, with branches (skip room, go to coach, relapse) is specified in **[user-flows.md](./user-flows.md)**. Summary:

```
Craving hits
   │
   ▼
Home → "I WANT TO SMOKE" CTA
   │
   ▼
Craving Check-In (how strong, optional trigger tag)
   │
   ├──▶ Path A: Craving Intervention Hub → breathing / distraction / AI coach → resolved or → Path B
   │
   └──▶ Path B: Digital Smoking Room
              │
              ▼
        Select cigarette (what you normally smoke)
              │
              ▼
        Select quantity (supports single sticks, not just packs)
              │
              ▼
        See equivalent spend (₹) — this is what you'd have paid
              │
              ▼
        Tap amount/action bar → "Save this instead"
              │
              ▼
        Real UPI payment initiated (external UPI app handoff)
              │
              ▼
        Payment confirmed ──▶ Savings ledger entry created ──▶ Quit Wallet balance increases
              │                                                        │
              └──▶ Payment failed/cancelled → retry or exit, no ledger entry, no false "saved" state
                                                                        ▼
                                                        Success screen: cigarettes avoided +N, streak, wallet balance
```

If the user smokes anyway (before, during, or instead of this flow), they can log it honestly via **Relapse Log** — no punitive UI, streak adjusts transparently, and the app keeps going.

## H. Information Architecture

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
├── Home (SCR-09)                     — dashboard, primary craving CTA
├── Wallet                            — Quit Wallet (SCR-22), Savings History (SCR-23), Savings Goals (SCR-24)
├── Progress (SCR-25)                 — stats, Cigarettes Avoided detail (SCR-26)
├── Coach                             — AI Craving Coach entry (SCR-13)
└── Profile / Settings (SCR-28)       — Smoking Profile Edit (SCR-29), Payment & Savings Destination (SCR-30),
                                         Account & Privacy (SCR-31), Help & Support (SCR-32)

Global / Modal Flows (reachable from Home CTA or push notification, not tabs)
├── Craving Check-In (SCR-10)
├── Craving Intervention Hub (SCR-11)
│   ├── Breathing Exercise (SCR-12)
│   └── Quick Distraction (SCR-11a)
├── Digital Smoking Room
│   ├── Cigarette Selection (SCR-14)
│   ├── Quantity Selection (SCR-15)
│   ├── Amount Confirmation (SCR-16)
│   ├── UPI Payment Handoff (SCR-17)
│   ├── Payment Processing (SCR-18)
│   ├── Payment Success (SCR-19)
│   └── Payment Failure / Retry (SCR-20)
├── Relapse Log (SCR-21)
└── Notifications Center (SCR-27)
```

Navigation rules:
- Bottom nav is 5 tabs: Home, Wallet, Progress, Coach, Profile. Always visible except inside modal flows (Smoking Room, Craving Check-In/Intervention, Relapse Log), which are full-screen and end by returning to Home.
- The **primary Home CTA ("I WANT TO SMOKE")** is the only entry point into the Craving Check-In → Intervention/Room fork. The Smoking Room is also reachable directly from Home via a secondary "Open Smoking Room" action for a user who already knows they want to log a save without going through the check-in (see [user-flows.md](./user-flows.md) §2 for why both entry points exist).
- Any modal flow can be exited via a top-left back/close at any step **except** Payment Processing (SCR-18), where the user must wait for the payment provider's callback/timeout before the screen releases control — this is a payment-integrity requirement (see §L), not a UX preference.

---

## I. Screen-by-Screen Specification

Depth is calibrated: the craving→payment→savings path and the wallet/ledger screens are specified in full (purpose, user goal, elements, CTA, all states, navigation). Onboarding and settings sub-screens are specified at the depth needed to build them, with states collapsed where a state genuinely does not apply (noted as N/A rather than omitted silently).

### SCR-01 — Splash
- **Purpose**: brand load screen while session/auth state resolves.
- **User goal**: none — transitional.
- **UI elements**: logo/wordmark, no interactive elements.
- **CTA**: none.
- **States**: Loading (default, <1.5s target) → routes to Onboarding Carousel (new device) or Home (existing session). Error: on auth-check failure, route to Phone Entry rather than blocking.
- **Navigation**: auto-routes; not user-navigable.

### SCR-02 — Onboarding Carousel
- **Purpose**: communicate the core value prop before asking for phone number.
- **User goal**: understand what this app does and why it's different from "just tracking."
- **UI elements**: 3 slides — (1) "Every cigarette you skip, you get richer" (2) how the Digital Smoking Room works, 3-icon strip (3) "Your money, your bank — we never hold your savings hostage" (trust framing for the payment step ahead). Skip link, page dots, Next/Get Started button.
- **CTA**: "Get Started" → Phone Entry.
- **States**: Loading N/A (static assets). Empty N/A. Error N/A. Success: last slide → CTA enabled.
- **Navigation**: Skip and Get Started both go to SCR-03.

### SCR-03 — Phone Entry
- **Purpose**: capture the phone number to begin OTP auth. India-first auth uses phone + OTP as primary; no email/password in MVP.
- **User goal**: log in quickly.
- **UI elements**: +91 prefix (India-only in MVP) locked, 10-digit input, consent line linking Privacy Policy & Terms, "Send OTP" button.
- **CTA**: "Send OTP".
- **States**: Empty (default, button disabled until 10 valid digits). Loading (button spinner while OTP send request in flight). Error (invalid number format inline; OTP send failure → toast with retry, no navigation change). Success → OTP Verification.
- **Navigation**: back → Onboarding Carousel.

### SCR-04 — OTP Verification
- **Purpose**: verify phone ownership.
- **User goal**: get in fast.
- **UI elements**: 6-digit OTP input (auto-read via Android SMS Retriever API where available), countdown + "Resend OTP" (enabled after 30s), edit-number link.
- **CTA**: auto-submits on 6th digit; no explicit button needed, but a "Verify" fallback button is shown for manual entry.
- **States**: Loading (verifying). Error (wrong OTP — inline error, input clears, does not navigate away; expired OTP — prompt resend). Success → first-run onboarding if new user, else Home.
- **Navigation**: back → Phone Entry (resets OTP send).

### SCR-04A — Age Verification

- **Purpose**: confirm the user meets the self-declared 18+ baseline required by §IX.8 before any product/behavioral data is collected. Backfilled as a formal screen ID here (previously specified only in the design layer — see `design/screen-specifications.md` — as a gap the PRD itself had left open; no functional change from that design, just formal adoption into this document's own numbering).
- **User goal**: get past a quick, factual eligibility check.
- **UI elements**: headline ("How old are you?"), one-line context ("[Product name] is built for adult smokers. We ask so we can keep it that way."), native date-of-birth picker, "Continue" CTA.
- **CTA**: "Continue" — enabled once a valid date is entered.
- **States**: Empty (default). Error (invalid/future date → inline validation, no submission possible). Under-18 → a calm, firm, terminal full-screen message ("[Product name] is built for adult smokers 18 and older. We're not able to continue right now.") with no retry loop and no further input — this ends the session, consistent with Principle 2's no-shame register even in the one place the product has to say no. Success (≥18) → SCR-05.
- **Navigation**: forward → SCR-05. No back to auth (consistent with the rest of onboarding's navigation pattern). This step is **not** skippable or resumable-if-incomplete — unlike the onboarding steps from SCR-05 onward, age-gating sits in the same non-negotiable category as phone/OTP auth itself (Functional Requirement 14 excludes it from the "resumable/skippable" rule for the same reason: it's a safety/compliance baseline, not a product-completeness step).

### SCR-05 — Smoking Profile Setup
- **Purpose**: capture what the user normally smokes, so the Smoking Room can mirror their real spend without the user re-entering it every craving.
- **User goal**: set this up once, quickly, without feeling judged.
- **UI elements**: uses the shared **Brand Picker** component (identical to the one used mid-craving in SCR-14 — see §J for its full spec: search, recent/previously-used, "I can't find my brand," custom entry) to select or enter the user's usual brand. Once a brand is chosen (from the reference list or typed as custom), **price configuration** follows in one of two modes:
  - **Pack mode (default/primary)**: pack price (₹) + cigarettes per pack (defaults offered: 10, 20, custom) → **cost per cigarette is calculated automatically** (`pack_price ÷ cigarettes_per_pack`, rounded to the nearest paise) and shown to the user before they confirm, never entered directly in this mode.
  - **Single-stick mode**: a toggle ("I usually buy single cigarettes, not packs") switches to direct cost-per-cigarette entry — for the loose-stick-only buyer who has no pack price to reference. This is not a lesser/fallback option — it is a fully first-class entry mode, since loose-stick purchasing is the norm for much of the target user base (PRD §B).
  - Average sticks/day input (slider or stepper). "I smoke more than one brand" toggle (adds a second profile via the same Brand Picker + price configuration flow, supported from MVP — see US-04).
- **CTA**: "Continue".
- **States**: Empty (defaults unselected, Continue disabled until brand + a valid price configuration + at least one quantity field are set). Loading N/A (local form). Error (pack price or per-stick price = 0/non-numeric, or cigarettes-per-pack = 0 → inline validation on the specific field). Success → SCR-06.
- **Navigation**: no back to auth; a later back press exits onboarding only with a confirmation ("You can finish this later from Profile" — see Functional Requirements, onboarding must be resumable, not blocking).

### SCR-06 — Quit Motivation & Goal Selection
- **Purpose**: capture *why* — used to personalize copy (not used for any medical/clinical logic).
- **User goal**: state their motivation, feel the app "gets" their reason.
- **UI elements**: multi-select chips (health, money, family, fitness, smell/appearance, other free-text), optional target framing ("cut down" vs "quit completely" toggle — both are supported goals, not just abstinence, because harm-reduction users are in scope).
- **CTA**: "Continue".
- **States**: Empty (Continue enabled even with zero selection — this step must not block onboarding). Success → SCR-07.
- **Navigation**: back → SCR-05.

### SCR-07 — Savings Destination Setup
- **Purpose**: capture where the user wants their "not-smoking" money to actually land. This is the most consequential onboarding screen — see §L for why the destination model exists and what it must never become.
- **User goal**: tell the app where their real money should go, and trust that it will actually go there.
- **UI elements**: explanation copy ("We never hold your money. Every save goes straight to your own account."), destination options: (a) your own UPI-linked bank account (same or a different account/VPA than the one you pay from), (b) a savings goal label attached to that same destination (e.g., "New phone fund") — optional, can be added later from Wallet. VPA/account entry via standard UPI linking (delegated to the payment provider SDK, not built in-house — see §L). Skip option: "Set this up when I make my first save" — **the flow must be skippable**, because forcing a bank-linking step during onboarding (before the user has felt any craving) is a known drop-off risk; deferring it to the first real Smoking Room payment keeps onboarding fast per Principle 1.
- **CTA**: "Continue" (or "Skip for now").
- **States**: Loading (during provider VPA verification call). Error (invalid VPA / verification failure → inline, does not block skipping). Success → SCR-08.
- **Navigation**: back → SCR-06.

### SCR-08 — Notification Permission Priming
- **Purpose**: explain *why* notifications matter (craving-time reminders, streak nudges) before hitting the Android OS permission dialog, to improve opt-in rate.
- **User goal**: decide whether to allow notifications.
- **UI elements**: explanation copy + illustrative example notification, "Allow Notifications" (triggers OS dialog) and "Not now" (skips, revisitable from Settings).
- **CTA**: "Allow Notifications".
- **States**: Success (permission granted or denied — both are valid completed states, onboarding proceeds either way). Error N/A.
- **Navigation**: → SCR-09 (Home) regardless of permission outcome. Onboarding is now complete.

### SCR-09 — Home Dashboard
- **Purpose**: daily landing screen; surfaces progress at a glance and is the entry point to the craving flow.
- **User goal**: see how I'm doing, and have an obvious action the moment a craving hits.
- **UI elements**: smoke-free streak (days/hours since last logged cigarette or app start), money saved (running total, large/primary numeral), cigarettes avoided (secondary numeral), primary CTA **"I WANT TO SMOKE"** (large, thumb-reachable, high-contrast — this is the single most important tap target in the app), secondary action "Open Smoking Room directly" (smaller, for users who don't need the check-in step), recent activity snippet (last 1–2 savings events), a soft prompt if Savings Destination was skipped in onboarding ("Add your savings destination" banner).
- **CTA**: "I WANT TO SMOKE" (primary) → SCR-10. "Open Smoking Room" (secondary) → SCR-14.
- **States**: Loading (skeleton for stats while fetching). Empty (Day 1, zero saved — copy must feel like a fresh start, not a deficient state: "Your streak starts now"). Error (stats fetch fails → show last cached values with a subtle "updating…" indicator, never a blocking error on Home). Success (normal populated state).
- **Navigation**: bottom nav to Wallet/Progress/Coach/Profile always available; CTA and secondary action as above.

### SCR-10 — Craving Check-In
- **Purpose**: quick, low-friction capture of craving intensity/trigger, used to route the user and to power the AI coach's context and analytics — not a clinical assessment.
- **User goal**: acknowledge the craving in under 10 seconds and get to relief.
- **UI elements**: intensity slider or 3-tap scale (mild/strong/overwhelming), optional trigger chips (stress, social, after meal, boredom, alcohol, other), all optional — no field is required.
- **CTA**: "Continue" (always enabled, even with nothing selected — speed over data completeness, per Principle 1).
- **States**: Success only; no loading/error (fully local, no network dependency to proceed).
- **Navigation**: → SCR-11 (Intervention Hub) by default. Back → SCR-09.

### SCR-11 — Craving Intervention Hub
- **Purpose**: offer a genuine fork — try to ride out the craving, or go straight to the Smoking Room. Never a gate in front of the Room.
- **User goal**: decide which path helps right now.
- **UI elements**: three equally-weighted options — "60-second breathing exercise" (→ SCR-12), "Quick Distraction" (→ short, harmless jokes/prompts, see below), "Go to the Smoking Room" (→ SCR-14) — plus a small "I already smoked" link (→ SCR-21 Relapse Log, always available, never hidden).
- **Revision (2026-09-16, see DECISIONS.md)**: Quick Distraction replaces "Talk to your AI coach" as the Hub's third equal-weight option, per an explicit product decision made in chat. This reverses an earlier decision (recorded in `docs/project/final-foundation-review.md` §9 item and `mvp-scope.md`'s prior "should-not-have" note) that had cut a fourth "Quick distraction" card as unaccounted-for scope creep — it is no longer a fourth option bolted onto the existing three, it now *is* one of the three, deliberately replacing AI coach in this specific screen. **The AI Craving Coach itself is not removed from the product** — it remains reachable via its own entry point (Coach tab / floating entry, SCR-13) exactly as before; it is only no longer one of the Intervention Hub's three cards.
- **CTA**: one of the three options above.
- **States**: Success only (static choice screen).
- **Navigation**: back → SCR-10. Any option's completion routes back to SCR-09 (Home) unless the user proceeds into the Smoking Room, which follows its own flow.

### SCR-11a — Quick Distraction
- **Purpose**: a short, lightweight mental reset during a craving — not a coping technique that claims to resolve the craving, just a brief diversion.
- **User goal**: get a few seconds of harmless distraction, then decide what's next.
- **UI elements**: "Need a quick distraction?" headline, a grid of short jokes/prompts (India-first, optionally Hinglish, never medical or shame-adjacent), tap-to-reveal, "Show another joke," "Back to list," and "Return to craving options."
- **CTA**: tap a joke card → reveals it; "Show another joke" cycles to a new one.
- **States**: list view; joke-detail view.
- **Navigation**: back → SCR-11. Does not create a terminal craving outcome by itself — reaching "Return to craving options" leaves the session open for another path, matching breathing's "Still craving" behavior.

### SCR-12 — Breathing Exercise
- **Purpose**: a scripted 60–90 second guided breathing intervention as a genuine craving-riding tool.
- **User goal**: get through the acute craving spike without spending money or smoking.
- **UI elements**: animated breathing guide (inhale/hold/exhale pacing), timer, "I feel better" / "Still craving" outcome buttons at the end.
- **CTA**: outcome buttons at completion.
- **States**: Loading N/A (local animation). Success (exercise completed) branches: "I feel better" → SCR-09 with craving_resolved logged; "Still craving" → SCR-11 (offers Quick Distraction or the Room next, does not force retry of breathing).
- **Navigation**: exit (X) available throughout, logs craving as abandoned, not resolved or relapsed.

### SCR-13 — AI Craving Coach Chat
- **Purpose**: conversational support for the craving, with clear non-clinical framing and safety guardrails (see §IX).
- **User goal**: talk through the urge with something that responds like it understands, and get a concrete next step.
- **UI elements**: chat thread, text input, quick-reply chips (e.g., "It's about stress", "I want to smoke anyway", "I feel fine now"), persistent small-print disclaimer ("Not a medical service. In a crisis, contact [helpline — see §IX]"), an always-visible "Go to Smoking Room instead" shortcut and "I already smoked" shortcut so the chat is never a dead end.
- **CTA**: send message / quick-reply chips.
- **States**: Loading (typing indicator while AI responds). Empty (first open — coach sends an opening message referencing the check-in intensity/trigger if provided). Error (AI response failure → apologetic fallback message with the two shortcut actions still available — the user must never be stuck with a broken chat and no way out). Success (ongoing conversation).
- **Navigation**: back → Home (conversation state persists for the session per Functional Requirements).

### SCR-14 — Digital Smoking Room: Cigarette Selection (Brand Picker)
- **Purpose**: select which cigarette brand (from the user's own saved smoking profile(s), or a one-off/new brand) this craving/save is "standing in for." This is a **behavioral simulation input, never a product catalog** — see Immutable Rules 1–2 and the constraints below.
- **User goal**: quickly confirm what I'd normally be buying right now, even if it's not my usual brand.
- **UI elements** (the **Brand Picker**, shared with SCR-05 and SCR-29):
  - **Usual brand**: the user's `is_primary` smoking profile shown as the single large, pre-highlighted default tap target at the top — for a user with one profile, this is effectively a 0-tap pass-through (still visible for a beat, per [user-flows.md](./user-flows.md) §3.2).
  - **Recently / previously used brands**: below the usual brand, up to 3 of the user's other saved profiles, ordered by most-recently-used-in-a-transaction (`last_used_at`) — surfaces occasional/secondary brands without the user having to search for something they've already told the app about.
  - **Brand search**: a search field that filters both the user's own saved profiles and the admin-managed brand reference list (`cigarette_brand_reference`, autocomplete-only — see database-schema.md §3.3) by name, for a user who smokes many things or wants to log an unusual one quickly.
  - **"I can't find my brand"**: an always-visible, unmissable link (not buried) that opens **custom brand entry** — a plain text field for the brand name, immediately followed by the same price-configuration step as SCR-05 (pack mode or single-stick mode), inline, without leaving the Smoking Room. On completion this silently creates a new `smoking_profiles` row (`is_primary=false` unless it's the user's very first profile) and proceeds to SCR-15 with it selected — the user never has to detour to Settings mid-craving.
  - **Constraints** (Immutable Rules 1–2, Principle 4): no product imagery, no manufacturer logos, no shelf/catalog visual treatment, no "popular" or algorithmically-recommended brands, no pricing sourced from anywhere but the user's own entry. Brand names the user types as custom entries are private to their own `smoking_profiles.brand_label` and are never added to or shown in the shared `cigarette_brand_reference` list (no crowdsourced/unmoderated brand catalog).
- **CTA**: tap a brand (saved, recent, or search result) → advances immediately (no separate "Next" button; selection *is* the action, to save a tap). Custom entry advances after price configuration is completed.
- **States**: Loading (fetching saved profiles — should be instant/cached). Empty (no smoking profile set at all — opens directly into custom brand entry, effectively an inline SCR-05, then returns here). Error (profile fetch fails → falls back to custom brand entry so the flow is never blocked). Success → SCR-15.
- **Navigation**: back → wherever the Room was entered from (SCR-09 or SCR-11). Back from within custom brand entry returns to the brand list, not out of the Room.

### SCR-15 — Digital Smoking Room: Quantity Selection
- **Purpose**: select how many cigarettes this save represents — critically, down to a **single stick**, not only full-pack multiples.
- **User goal**: match the amount to what I'd actually have bought right now (often just 1–2 sticks, not a pack).
- **UI elements**: large stepper defaulting to 1, quick-select chips for common quantities (1, 2, 5, pack-size), running price preview updates live as quantity changes.
- **CTA**: "Continue" (or tap-to-advance on chip selection, consistent with SCR-14's low-friction pattern).
- **States**: Empty N/A (defaults to 1). Success → SCR-16.
- **Navigation**: back → SCR-14 (preserves quantity if user returns).

### SCR-16 — Digital Smoking Room: Amount Confirmation
- **Purpose**: the core moment — show the real ₹ amount and let the user commit to saving it instead of spending it.
- **User goal**: confirm "yes, save this" as fast as possible.
- **UI elements**: large amount display (₹ equivalent to selection), one-line summary ("2 × Gold Flake ≈ ₹24"), destination preview ("Going to: [savings destination label]" or a prompt to set one now if skipped in onboarding — this must be resolved before payment can proceed, see §L), the full-width **amount/action bar** doubling as the primary CTA per the brief's flow ("Tap the amount/action bar").
- **CTA**: tap the amount/action bar → "SAVE ₹24" (uppercase, matching Immutable Rule 4's emphasis convention for the two ends of the core loop's central decision — see `design/design-system.md` §5) → initiates payment (SCR-17).
- **States**: Loading N/A. Error (no savings destination configured → inline prompt to set one, blocks the action bar until resolved — a payment cannot be initiated without a known destination, this is a hard requirement not a UX nicety, see §L). Success → SCR-17.
- **Navigation**: back → SCR-15.

### SCR-17 — UPI Payment Handoff
- **Purpose**: hand off to the user's chosen UPI app (or an in-app UPI collect flow via the payment provider SDK) to authorize the real payment.
- **User goal**: authorize the payment the way they always do — nothing new to learn.
- **UI elements**: standard UPI app chooser (OS/provider-driven, not custom-built), or in-app UPI-intent deep link. Minimal custom UI here — this screen is largely a pass-through to the OS/provider payment surface by design (fewer custom screens = fewer places to break trust on a money screen).
- **CTA**: none custom; user acts inside the UPI app.
- **States**: Loading (waiting for UPI app to open — timeout fallback if the deep link fails to launch, e.g., "Couldn't open a UPI app — try again or choose another app"). Error (no UPI app installed → clear message with guidance, does not crash or hang). 
- **Navigation**: returns to app (SCR-18) via provider callback/deep link return when the user completes or cancels in the UPI app.

### SCR-18 — Payment Processing
- **Purpose**: bridge the gap between "user authorized in UPI app" and "payment provider confirms success/failure" — UPI settlement is not always instant.
- **User goal**: know the app hasn't frozen, and get a fast answer.
- **UI elements**: progress indicator, reassurance copy ("Confirming your payment — this usually takes a few seconds"), no cancel action once the provider call is in flight (see Navigation rule in §H — this is intentional to avoid double-submission/duplicate-payment risk, see §L).
- **CTA**: none (transitional).
- **States**: Loading (default/only visible state; internally polls or listens for provider webhook/callback with a bounded timeout, e.g., 30–60s). Success → SCR-19. Error/timeout → SCR-20 (ambiguous outcomes — e.g., provider hasn't confirmed within timeout — must route to SCR-20 with a "checking" status, never falsely to SCR-19; see §L reconciliation).
- **Navigation**: none available during Loading; auto-routes on resolution.

### SCR-19 — Payment Success (Savings Confirmation)
- **Purpose**: the emotional payoff — confirm the save landed and make progress feel real and immediate.
- **User goal**: feel good, see the number go up, know it actually worked.
- **UI elements**: confirmation animation/moment, amount saved this transaction, updated Quit Wallet balance, updated cigarettes-avoided count, streak status, share/celebrate action (optional, non-blocking), "Done" CTA.
- **CTA**: "Done" → Home.
- **States**: Success only (this screen is only reachable on confirmed payment + ledger write — see §L, a savings ledger entry must exist before this screen renders, never optimistically before confirmation).
- **Navigation**: "Done" → SCR-09. No back (payment is complete; back should also resolve to Home, not re-enter the payment flow).

### SCR-20 — Payment Failure / Retry
- **Purpose**: handle failed, cancelled, or unconfirmed payments without losing the user's context or money.
- **User goal**: understand what happened and either retry fast or bail out safely.
- **UI elements**: status-specific messaging — distinct copy for "cancelled by you," "failed," and "we're still checking with your bank" (see §L, ambiguous states must say so honestly rather than guess), retry CTA (re-attempts with the same selection, not from scratch), "Exit without saving" secondary action.
- **CTA**: "Try again" (→ SCR-17) or "Exit" (→ SCR-09, no ledger entry created, no false success state).
- **States**: this screen *is* the error state for the payment flow; it further branches: Failed (clear failure, safe to retry immediately), Cancelled (user backed out, safe to retry), Pending/Unconfirmed (must not offer immediate retry that could double-charge — see §L duplicate-payment handling; instead shows "We'll update you within a few minutes" and routes to Home, with async resolution via notification once reconciled).
- **Navigation**: → SCR-17 (retry) or SCR-09 (exit).

### SCR-21 — Relapse Log
- **Purpose**: let the user honestly record that they smoked, without punishment, so the app's data (streak, coach context) stays truthful and useful.
- **User goal**: log it and move on, without feeling judged.
- **UI elements**: neutral framing ("That happens. Let's log it and keep going."), quantity smoked (stepper, supports partial/single stick), optional trigger tag (reuses SCR-10's chip set), no shame copy, no red/warning color language.
- **CTA**: "Log and continue".
- **States**: Success only.
- **Navigation**: → SCR-09. Streak recalculates transparently (see Functional Requirements — streak logic must be visible/explainable, not a black box that silently resets).

### SCR-22 — Quit Wallet
- **Purpose**: show the user's accumulated savings as a trustworthy, always-accurate dashboard — the ledger/balance view described fully in §L.
- **User goal**: see how much I've actually saved, and trust the number.
- **UI elements**: total saved (headline number), a short "how this works" link (reinforces non-custodial model — "This is a record of what's been sent to your account, not money we're holding"), recent transactions preview (→ SCR-23 for full history), active savings goals preview (→ SCR-24), "Set a savings destination" prompt if unset.
- **CTA**: navigational only (View history, View goals, Set destination).
- **States**: Loading (skeleton while ledger totals fetch). Empty (Day 1 / zero savings — encouraging copy, not blank/dead). Error (fetch failure → show last cached balance with an "updating…" indicator, never blank on error — a wallet screen must never appear to show ₹0 due to a network error, since that is trust-critical; see §L reconciliation and Functional Requirements). Success (populated).
- **Navigation**: tab bar; drill-ins to SCR-23/SCR-24.

### SCR-23 — Savings History
- **Purpose**: itemized, chronological record of every savings ledger entry.
- **User goal**: verify/audit what's happened, transaction by transaction.
- **UI elements**: list of entries (date, cigarette/quantity represented, amount, status), filter by date range, tap an entry for detail (payment reference/UTR for user's own reconciliation with their bank statement — see §L).
- **CTA**: none primary; list is the content.
- **States**: Loading (list skeleton). Empty (no transactions yet — "Your first save will show up here"). Error (fetch failure → retry action, cached list shown if available). Success (populated, paginated for long histories).
- **Navigation**: back → SCR-22.

### SCR-24 — Savings Goals
- **Purpose**: optional labels/targets attached to the wallet balance (e.g., "New phone — ₹5,000 of ₹20,000") for motivational framing — not separate custodied pools (see §L, goals are a display label on the single underlying ledger, not fund segregation).
- **User goal**: give my savings a purpose beyond a number.
- **UI elements**: goal list with progress bars, "Add goal" (name, target amount, optional image/icon), edit/delete existing goal.
- **CTA**: "Add goal".
- **States**: Loading (list fetch). Empty ("No goals yet — give your savings a name"). Error (save/create failure → inline retry, form state preserved). Success (populated).
- **Navigation**: back → SCR-22.

### SCR-25 — Progress / Stats
- **Purpose**: broader progress picture beyond money — streak, avoidance count, and (optionally, non-clinically) generic time-based milestones.
- **User goal**: see the whole picture of how I'm doing.
- **UI elements**: streak calendar/heatmap, cigarettes avoided (→ SCR-26 detail), money saved summary (mirrors SCR-22 headline), milestone markers (e.g., "3 days smoke-free," "₹500 saved") framed generically, not as clinical health claims (see §IX — no unverified "your lungs have recovered X%" style claims).
- **CTA**: navigational (→ SCR-26).
- **States**: Loading/Empty/Error/Success as SCR-22 pattern.
- **Navigation**: tab bar; drill-in to SCR-26.

### SCR-26 — Cigarettes Avoided Detail
- **Purpose**: breakdown of the avoidance count (by day/week, by trigger tag if available) — makes the headline number explainable, not a mystery figure.
- **User goal**: understand where my "avoided" count is coming from.
- **UI elements**: chart/list by period, breakdown by trigger tag (if logged during check-ins), definition tooltip (explains exactly how "avoided" is calculated — see Functional Requirements, this must be a transparent, documented calculation, not a black box).
- **CTA**: none primary.
- **States**: Loading/Empty ("Avoid your first cigarette to see this fill in")/Error/Success.
- **Navigation**: back → SCR-25.

### SCR-27 — Notifications Center
- **Purpose**: in-app record of reminders, streak nudges, coach prompts, and payment-status updates (especially async resolutions from SCR-20's pending state).
- **User goal**: catch up on anything I missed, and resolve any pending payment updates.
- **UI elements**: chronological list, unread indicator, tap-through to relevant screen (e.g., a resolved pending payment → SCR-23 entry).
- **CTA**: none primary; items are tap-through.
- **States**: Empty ("Nothing yet"). Loading/Error/Success standard pattern.
- **Navigation**: reachable from a bell icon on Home and from push notification tap; back → previous screen.

### SCR-28 — Profile & Settings
- **Purpose**: account hub and settings entry point.
- **User goal**: manage my account, profile, and preferences.
- **UI elements**: profile summary (phone, member since), links to SCR-29/30/31/32, logout.
- **CTA**: navigational; "Log out" as a destructive-but-safe action (confirmation required).
- **States**: Loading/Error/Success standard pattern. Empty N/A.
- **Navigation**: tab bar; drill-ins as listed.

### SCR-29 — Smoking Profile Edit
- Purpose/UI: same fields as SCR-05, editable, supports multiple brand profiles, supports deletion of a profile (with a warning if it's the only one, since the Smoking Room needs at least one profile or a one-off manual entry path).
- States: standard Loading/Error/Success; Empty N/A (editing existing data).
- Navigation: back → SCR-28.

### SCR-30 — Payment & Savings Destination Settings
- Purpose/UI: same fields as SCR-07, editable at any time; shows currently linked destination(s), allows changing/removing, re-links via provider SDK.
- States: standard pattern; Error must clearly distinguish "removed successfully" from "removal failed" since this affects where future real money goes — highest-caution screen in Settings.
- Navigation: back → SCR-28.

### SCR-31 — Account & Privacy
- Purpose/UI: data export request, account deletion request (see §IX — smoking status is sensitive personal data under DPDP Act 2023 handling expectations), consent management, link to privacy policy.
- States: standard pattern; account deletion requires explicit confirmation and states what happens to historical savings records.
- Navigation: back → SCR-28.

### SCR-32 — Help & Support
- Purpose/UI: FAQ, contact/support channel, and the quit-helpline resource required by §IX (verify current number pre-launch — not asserted as fact here), payment dispute/refund request entry point (routes into the reconciliation process in §L).
- States: standard pattern.
- Navigation: back → SCR-28.

---

## J. Digital Smoking Room — detailed UX

See **[user-flows.md](./user-flows.md) §3** for the full step-by-step UX specification of SCR-14 → SCR-20, including timing targets, tap-count budget, and the single-stick-vs-pack interaction model in detail.

## K. Craving → Payment → Savings journey

See **[user-flows.md](./user-flows.md) §4** for the end-to-end sequence diagram covering client, payment provider, and internal ledger, including every failure branch.

---

## L. Quit Wallet — provider-agnostic financial architecture

**This is the most legally and product-sensitive part of the spec. Read this section before building any payment or wallet screen.**

### L.0 The constraint this design works around

A company in India **cannot simply hold customer money** the way a bank or a licensed wallet (e.g., a PPI — Prepaid Payment Instrument — under RBI's PPI Master Directions) can. Doing so without the correct RBI authorization (as a bank, a licensed PPI issuer, or by partnering with one) is a regulatory non-starter. "Quit Wallet" is therefore a **product concept and a ledger**, not a stored-value account the company custodies, unless and until the company obtains or partners for that license. The requirements below are written to make the product work — and feel like a real wallet to the user — **without requiring the company to hold customer funds**.

### L.1 Core model: route-through, not hold — the two-leg mechanism

A UPI "collect" or "intent" payment cannot, by construction, land directly in an arbitrary destination the payer names at runtime — it settles into the collecting merchant's account. So "the money never becomes the company's" cannot mean "we don't collect it at all"; it means **whatever is collected is immediately forwarded out again, in the same flow, before it is ever treated as the company's own funds.** Concretely, every save is two linked money movements, not one:

1. **Collection leg**: the user authorizes a real UPI payment for the save amount, via their own UPI app, processed by a licensed Payment Aggregator (PA) into the platform's standard PA-regulated merchant collection account. This is an ordinary merchant collection — any registered business can do this through a PA relationship; it requires no special license.
2. **Payout leg**: on confirmed collection, the platform immediately triggers an outbound transfer of the **same amount** via the PA's Payout capability (e.g., RazorpayX Payouts, Cashfree Payouts, or equivalent) to the user's own **Savings Destination** — a bank account/VPA the user designated and had verified in SCR-07/SCR-30. This is a standard payout/vendor-transfer operation, not a stored-value instrument: the platform is not issuing prepaid value or holding a balance on the user's behalf, it is moving money it just collected straight back out to a named beneficiary. This is what makes the model licensable as a normal payout relationship rather than requiring an RBI PPI/e-money authorization.

The two legs happen automatically, back-to-back, as part of one user-initiated action — the user only ever sees a single "Save ₹X" action and a single outcome. **The payout leg is core MVP infrastructure, not a Phase 2 feature**: without it, the collection leg alone would leave the company holding the user's money, which is exactly what §L.0 rules out.

This is why SCR-16 hard-blocks payment until a Savings Destination is configured: it isn't just a UI label, it's the **payout beneficiary**, which the PA's payout API requires to be registered and verified (typically via penny-drop or UPI VPA validation) before it can receive a transfer — this is a real technical precondition, not a product nicety, and is why SCR-07/SCR-30's "Loading (during provider VPA verification call)" state exists. If a user has only one bank account, the destination can be that same account (the round trip still has value as a forcing/logging mechanism — friction plus a permanent record); a separate account, sub-account, recurring deposit, or a partner savings/investment product is preferable where the user has one, but is not required for MVP.

### L.2 Entities

| Entity | Description | Created when | Mutable? |
|---|---|---|---|
| **Savings Intent** | Represents "user wants to save ₹X for N sticks of brand Y" | User taps the amount/action bar on SCR-16 | No — cancelled/superseded, never edited |
| **Payment Transaction** | The PA-side **collection** object (UPI intent/collect) — leg 1 | Immediately after Savings Intent, 1:1 linked via an idempotency key = `savings_intent_id` | Status transitions only (via PA callback/webhook) |
| **Payout Transaction** | The PA-side **payout** object — leg 2, moving the collected amount to the Savings Destination | Immediately after the Payment Transaction is confirmed successful | Status transitions only (via PA callback/webhook), tracked independently of the collection leg |
| **Ledger Entry** | Internal, immutable, append-only record | On verified collection success (§L.5); carries the Payout Transaction's status alongside it, not gated behind full payout settlement | Never edited; corrections are new reversing entries, never in-place edits |
| **Quit Wallet Balance** | Derived value = sum of ledger entries (minus reversals) | Computed/materialized, not separately stored as source of truth | Always recomputed from ledger, never hand-edited |
| **Savings Destination** | The user's own bank account/VPA (or partner savings product) that funds route to — registered as a **payout beneficiary** with the PA | Onboarding (SCR-07) or Settings (SCR-30) | User-editable; edits require re-verification before use as a payout target |

### L.3 Payment initiation (collection leg)
- Initiated only from SCR-16 (Amount Confirmation), never automatically, never pre-authorized/stored for reuse in MVP (Principle 7).
- Uses the PA's UPI Intent or Collect flow (delegated to the PA's SDK — this PRD does not prescribe implementation).
- Every initiation carries a unique `savings_intent_id` used as the idempotency key with the PA, so a retried/duplicated client request cannot create two PA-side charges for the same intent.

### L.4 Payment verification (collection leg)
- The client (SCR-18) must **never** treat "the UPI app returned control to us" as success. Success is determined only by the PA's authoritative confirmation — a server-side webhook from the PA, cross-checked by a status API poll if the webhook hasn't arrived within the timeout window.
- SCR-19 (Success) is reachable **only** after the backend has received and validated PA confirmation for the collection leg **and** written the Ledger Entry. The client never renders a success state from client-side payment-app return alone. The client does not wait on full payout settlement to show SCR-19 (see §L.5a) — the user's save is complete and shown as such once collection is confirmed and the payout has been accepted for processing.

### L.5 Savings transaction → Ledger write
- A Ledger Entry is created by the backend **only** upon verified collection success (§L.4), inside the same transaction/operation as marking the Payment Transaction confirmed, and as the trigger for initiating the Payout Transaction (§L.5a) — the ledger write and payout initiation must be atomic or reconciled to eventual consistency with a documented retry, never left partially applied.
- No ledger entry is ever created speculatively (e.g., "optimistically" when the user taps the action bar) — this is the mechanism that keeps the Quit Wallet balance trustworthy.

### L.5a Payout fulfillment (payout leg) and its failure mode
- Immediately after the Ledger Entry is written, the backend initiates the Payout Transaction to the user's Savings Destination for the same amount, referencing `savings_intent_id` as the payout idempotency key.
- The Ledger Entry carries a `payout_status` (`initiated` → `completed` | `failed`) surfaced in Savings History (SCR-23) transaction detail — this is new state that did not exist when the model was thought of as a single-leg payment, and it is the one place the "money is real" promise (Principle 3) can be violated silently if not handled explicitly.
- **Payout succeeds** (expected, majority case): `payout_status = completed`, no further user-facing action; the SCR-19 confirmation the user already saw remains accurate.
- **Payout fails** (invalid/deactivated destination account, payout provider outage, beneficiary verification lapsed): this is a **new first-class failure mode** with no equivalent in a naive single-leg design. MVP policy: the platform automatically refunds the collected amount back to the user's original payment source (§L.9), reverses the Ledger Entry, and notifies the user (SCR-27) that the save didn't complete because their Savings Destination needs attention — directing them to SCR-30 to fix it. The platform must never sit on collected-but-unforwarded funds for an extended period while deciding what to do; auto-refund-on-payout-failure is the policy specifically because it keeps the "never hold funds" guarantee in §L.0 true even in this failure branch. (An alternative policy — retry the payout and keep the Ledger Entry standing while flagged — is a plausible V1 refinement once real payout failure rates are known, but MVP ships with the simpler, safer auto-refund default.)
- A bounded number of automatic payout retries (e.g., transient PA/network errors) happen before a failure is treated as terminal and triggers the refund path — this must not retry indefinitely and leave the transaction in limbo.

### L.6 Ledger
- Append-only, immutable, source of truth for the Quit Wallet balance, Savings History, and Savings Goals progress.
- Every entry references its `savings_intent_id` and the PA's transaction reference (UTR/reference number) for user-facing auditability (surfaced in SCR-23 transaction detail) and for reconciliation (§L.10).
- Corrections (e.g., a reconciliation finds a discrepancy) are made via new reversing/adjusting entries, never by mutating history — this preserves auditability and matches how the user's own bank statement works, which is the trust model being mirrored.

### L.7 Balance display
- Quit Wallet balance (SCR-22) is always computed from the ledger, never cached indefinitely without a documented staleness/invalidation rule.
- On a read failure, the UI shows the **last known good cached balance** with an explicit "updating…" affordance rather than a blank or zero state — a wallet screen showing ₹0 due to a transient error is a trust-destroying failure mode and must be treated as a P0 bug class, not an acceptable error state.

### L.8 Redemption / withdrawal
- **In the MVP model, there is no user-facing withdrawal flow**, not because money isn't moving, but because the payout leg (§L.5a) already moves it automatically, per transaction, at save-time — there is nothing left for the user to later "cash out." The Quit Wallet is a mirror/ledger of money the user already has in their own account, not a balance they need to request back.
- This must be stated explicitly in-product (SCR-22's "how this works" link) so users don't mistakenly believe they need to "withdraw" and don't distrust a wallet that has no withdraw button.
- Note for engineering: this means the Payout capability (§L.1, §L.5a) is **required infrastructure from day one of MVP**, not a Phase 2 add-on — any architecture doc that defers "payout"/"bank transfer to the user" to a later phase pending a banking/PPI partnership has misread this requirement. A PPI/bank partnership is only needed for a genuinely different future feature: **locked or custodial savings goals with a bonus/interest incentive**, where funds would need to be held for a period rather than paid out immediately — that is explicitly **out of MVP/V1 scope** (see [mvp-scope.md](./mvp-scope.md) §R.1) and is the only scenario in this product that would ever require an RBI PPI/e-money license.

### L.9 Refunds
- Refund path exists for: (a) **payout-leg failure** after successful collection (§L.5a — the primary, expected refund scenario in this model, distinct from a dispute), (b) duplicate-payment cleanup (§L.11), (c) user-reported erroneous transaction confirmed by support review (SCR-32 entry point), or (d) a PA-side chargeback/dispute on the collection leg.
- A refund is executed via the PA's refund API back to the original payment source, **and** recorded as a reversing Ledger Entry (never a silent deletion) so Savings History remains an accurate, immutable record of what actually happened, including the reversal.

### L.10 Failed payments
- No Ledger Entry is created for a failed or cancelled payment. SCR-20 renders, the Savings Intent is marked failed/cancelled, and no money has moved. This is the simple, safe majority case.

### L.11 Duplicate payments
- Prevented primarily via the idempotency key (§L.3) at the PA layer.
- As a second layer, the backend ledger-write step is idempotent on `savings_intent_id` — if a webhook is delivered more than once (a known real-world PA behavior), only one Ledger Entry is ever created per intent.
- If a duplicate charge nonetheless occurs at the PA/bank layer (rare, external failure mode), the reconciliation job (§L.12) must detect a Payment Transaction with no matching unique Savings Intent and flag it for the refund path (§L.9).

### L.12 Reconciliation
- A scheduled job compares the PA's settlement/transaction report against internal Ledger Entries and Payment Transaction records **for both legs** — a collection with no matching payout attempt, or a payout stuck `initiated` past a bounded threshold, are both reconciliation-critical findings under this model, not just collection-side mismatches.
- Discrepancies (PA shows success but no ledger entry; PA shows failure but a ledger entry exists; amount mismatches; a payout that never resolved) are flagged for operational review, not silently auto-corrected against user-facing balances.
- Any user-facing balance correction resulting from reconciliation is applied as a new, dated, visible Ledger Entry (§L.6) — never a silent balance edit — and should trigger a notification to the affected user (SCR-27) for transparency, consistent with Principle 7.

### L.13 What must be resourced before build (not a research question — a compliance/legal question)

Selecting the specific licensed PA and confirming it as a real technical/compliance fit requires **legal/compliance and PA vendor evaluation**, not additional product research — specifically: (a) that the chosen PA offers **both** UPI collection and a Payout API usable same-day/near-real-time (not just Phase-2-style batch payouts), since both legs are MVP-required per §L.1; (b) exact settlement-to-payout timing (T+0/T+1) and whether it's fast enough to keep the collect→payout gap acceptably short; (c) beneficiary KYC/verification requirements the PA imposes on a Savings Destination before it can receive payouts; (d) confirmation from counsel that this collect-then-immediately-payout pattern does not itself constitute a PPI/e-money activity given the platform never nets the funds as revenue. This is listed as an unresolved decision at the end of this document, not resolved here.

---

## N. Functional Requirements

1. Users authenticate via phone number + OTP (India numbers only in MVP).
2. A user may maintain one or more Smoking Profiles (brand, price, typical daily quantity); at least one is required to use the Smoking Room, with an inline setup path if missing.
2a. Each Smoking Profile's per-cigarette price is captured as either (a) pack price ÷ cigarettes per pack, auto-calculated and stored, or (b) a direct per-cigarette price for single-stick-only buyers — never an admin-controlled or catalog price (Immutable Rule 3). The user may update either input at any time; edits apply to future transactions only, never retroactively (each `payment_transactions` row snapshots the price at the time of that transaction).
2b. Brand selection (onboarding SCR-05, in-Room SCR-14, and Settings SCR-29) uses one shared Brand Picker supporting: the user's usual (primary) brand, up to 3 recently/previously used brands, free-text search across saved profiles and the admin-managed brand reference list, and a always-available "I can't find my brand" custom-entry path that creates a new profile inline (with its own price configuration) without leaving the current flow.
3. The Smoking Room must support quantity selection down to a single cigarette, not only full-pack multiples — the user is never forced to select a full packet.
4. The amount shown in the Smoking Room is computed live from the selected profile's per-cigarette price × quantity, in ₹, rounded to the nearest rupee.
5. A payment cannot be initiated from SCR-16 without a configured Savings Destination; the UI must prompt for one inline rather than fail silently or dead-end.
6. Payment success is determined exclusively by backend-verified PA confirmation; the client never self-reports success.
7. A Ledger Entry is created if and only if a payment is verified successful; it is immutable once created.
8. Quit Wallet balance, Savings History, Cigarettes Avoided, and streak are all derived/computed from the ledger and craving/relapse logs — never hand-set values.
9. "Cigarettes avoided" is calculated from a documented formula (e.g., baseline daily quantity from the smoking profile × smoke-free time elapsed, minus logged relapses) and that formula must be user-visible (SCR-26 tooltip), not a black box.
10. Users can log a relapse at any time from the Craving Intervention Hub or Home, with no restriction on frequency and no punitive UI treatment.
11. Streak recalculates transparently on relapse logging per a documented rule (e.g., streak resets to 0 from the relapse timestamp) — the rule must be the same one shown to the user in-product.
12. The AI Craving Coach must degrade gracefully on failure (SCR-13 error state) — the user is never left without an exit action.
13. All async/ambiguous payment outcomes (SCR-20 pending state) must resolve asynchronously via notification (SCR-27) once the reconciliation/webhook confirms, without requiring the user to keep the app open.
14. Onboarding (SCR-05 through SCR-08) must be resumable/skippable at every step except phone/OTP auth and Age Verification (SCR-04A) — a user must be able to reach Home with an incomplete profile or destination and complete it later, but cannot reach Home without having passed the age check.
15. Notification preferences (craving reminders, streak nudges, payment status) are individually toggleable from Settings.
16. The app supports Hindi and English at minimum in MVP (language toggle in Settings or system-locale-driven).

## O. Non-Functional Requirements

- **Performance**: Digital Smoking Room flow (SCR-14→SCR-16) must render each step in under 300ms on a mid/low-tier Android device on a 4G connection; this is the flow where latency directly competes with "walking to a shop."
- **Reliability**: payment verification path (§L.4) must be resilient to webhook delivery failure via a status-polling fallback; no payment may be left in an indefinitely ambiguous state from the user's perspective (bounded timeout + async notification).
- **Availability**: Home, Wallet, and Smoking Room screens should degrade to cached data rather than hard-fail when the network is unavailable, given Indian mobile connectivity variability; **payment initiation itself requires connectivity** and must fail clearly (not hang) when offline.
- **Device support**: Android, targeting compatibility across entry-level to flagship devices in active use in India; lightweight APK/bundle size and minimal background resource usage.
- **Localization**: Hindi + English text externalized (not hardcoded) from MVP to support the required bilingual support and future language additions.
- **Security**: no raw bank account numbers or UPI credentials stored by the app — all sensitive payment data handled via the PA SDK/tokenized references only; standard mobile app security practices (no sensitive data in logs, certificate pinning to PA/backend endpoints, secure storage for session tokens).
- **Privacy/compliance**: smoking status and craving data handled as sensitive personal data under India's DPDP Act 2023 expectations (see §IX) — explicit consent, data minimization, deletion support (SCR-31).
- **Accessibility**: minimum tap target sizes and contrast ratios suitable for stressed/impulsive use (a craving moment is not a careful, deliberate UI-reading moment) — larger-than-default touch targets on the Smoking Room and CTA elements specifically.

---

## VIII. Risks

| Risk | Why it matters | Mitigation direction |
|---|---|---|
| Regulatory misclassification as a wallet/PPI issuer | Could require an RBI license the company doesn't hold, or expose it to enforcement action | Non-custodial, route-through ledger model (§L) by design; legal review before launch (see unresolved decisions) |
| Payment provider (PA) rejects the "savings" use case or flags it as high-risk | UPI/PA providers underwrite merchant use cases; a novel "pay-to-not-buy-cigarettes" flow may need explicit provider sign-off | Early PA vendor conversation as a pre-build step, not a post-launch surprise |
| App perceived as tobacco-adjacent (store listing, payment provider, or app review) despite Principle 4 | Android app store policies and PA merchant policies both restrict tobacco-related commerce; even simulated selection UI risks misclassification | Strict adherence to Principle 4 in all copy/imagery; explicit review with Play Store policy and PA compliance before submission |
| Friction in the Smoking Room flow exceeds "walking to a shop" | Directly undermines the product thesis (§D) — if it's slower than buying, it will lose to the craving | Hard performance/tap-count budgets (§O, [user-flows.md](./user-flows.md) §3) |
| Users mistake Quit Wallet for a custodied balance and expect a "withdraw" button | Confusion/trust damage if the non-custodial model isn't communicated | Explicit "how this works" messaging at SCR-07, SCR-16, SCR-22 (§L.8) |
| AI Craving Coach gives inappropriate advice in a mental-health-adjacent or crisis moment | Safety and reputational risk; craving support intersects with stress/mental health | Guardrails and escalation path (§IX), non-clinical framing enforced in copy |
| Relapse-shaming design creeps in via well-intentioned gamification (streak loss, red states) | Directly contradicts Principle 2; known failure pattern in habit apps | Explicit neutral-copy requirement on SCR-21 and streak-reset logic; content review pass before ship |
| Sensitive data (smoking status) leakage or misuse (e.g., ad-tracking SDKs) | Smoking status can affect insurance/employment; reputational and legal exposure | Data minimization, no third-party ad SDKs sharing this data, DPDP-aligned consent (§O, §IX) |

## IX. Product Safety Requirements

1. No clinical or medical claims (e.g., "reverses lung damage," "cures nicotine addiction"). Health-adjacent copy must stay in generic, non-clinical language ("your body starts to recover" without invented specifics/percentages).
2. The AI Craving Coach (SCR-13) must carry a persistent, visible disclaimer that it is not a medical or clinical service.
3. The AI Craving Coach must have an escalation path: on detection of crisis language (self-harm, severe distress), respond with a fixed, reviewed message directing the user to appropriate professional resources/helplines, not attempt to counsel the crisis itself. **The specific helpline number(s) to reference (e.g., a national tobacco quitline / mental health helpline) must be verified as current and correct by the team before launch — not asserted as fact in this document.**
4. Relapse logging and streak mechanics must never use shaming, punitive, or red/warning-coded UI (Principle 2, enforced as a safety requirement, not just a tone preference).
5. Smoking status, craving logs, and relapse logs are treated as sensitive personal data: explicit onboarding consent, no sharing with third-party advertising/analytics SDKs, user-initiated export and deletion supported (SCR-31), aligned with DPDP Act 2023 expectations.
6. No dark patterns in the payment flow — a user must always be able to see the exact amount and destination before confirming (Principle 7), and must always be able to cancel before the point of no return (SCR-16, before SCR-17 handoff).
7. The product must not, at any point, surface tobacco brand purchase links, delivery options, or seller contact information — the brand/cigarette "selection" UI is strictly a behavioral parameter, never a storefront (Principle 4).
8. Minors: the product is intended for adult smokers; age-gating (self-declared minimum age at onboarding) is required as a baseline safety/compliance measure.

## X. Acceptance Criteria for Major Features

**Digital Smoking Room → Payment → Savings**
- Given a user with a configured smoking profile and savings destination, when they select a brand and quantity and confirm payment, then a real UPI payment is initiated for the exact displayed amount.
- Given a payment is confirmed successful by the PA, then exactly one immutable Ledger Entry is created, the Quit Wallet balance increases by the exact amount, and SCR-19 renders.
- Given a payment fails, is cancelled, or times out, then no Ledger Entry is created and SCR-20 renders with status-appropriate messaging.
- Given the same `savings_intent_id` is submitted more than once (retry, duplicate webhook), then at most one Ledger Entry is ever created for it.
- Given a collection succeeds but the subsequent payout to the Savings Destination fails after exhausting retries, then the collected amount is automatically refunded to the user's original payment source, the Ledger Entry is reversed, and the user is notified with a clear next step (fix the Savings Destination) — the platform is never left holding confirmed-collected, unforwarded funds.
- Given a user selects a brand not in their saved profiles (via search or "I can't find my brand"), then they can enter a pack price + cigarettes-per-pack (or a direct per-cigarette price) inline, a new Smoking Profile is created from it, and the flow proceeds to quantity selection without leaving the Digital Smoking Room.
- Given a user selects any quantity from 1 cigarette up to a full pack, then the displayed and charged amount is always `selected profile's per-cigarette price × quantity` — never a value sourced from an admin-managed catalog.

**Quit Wallet**
- Given any state of connectivity, the Quit Wallet balance shown is either the accurate current ledger sum or the last known good cached value with a visible "updating" indicator — never a blank or zero value caused by a fetch error.
- Given a user has never made a save, the Quit Wallet shows an explicit empty state, not an error or blank screen.

**Craving Intervention**
- Given a user taps "I WANT TO SMOKE," they can reach the Digital Smoking Room, the Intervention Hub, or a Relapse Log without being forced through any of the others first.
- Given a user completes a breathing exercise or coach conversation and reports feeling better, the craving is logged as resolved without payment.

**Relapse Logging**
- Given a user logs a relapse, the streak recalculates per the documented rule and is reflected consistently on Home, Progress, and Cigarettes Avoided screens within the same session.
- Given a relapse is logged, no shaming copy, iconography, or color-coding is shown anywhere in the resulting UI.

**AI Craving Coach**
- Given the AI response fails or times out, the user is shown a fallback message and retains working "Go to Smoking Room" and "I already smoked" shortcuts.
- Given crisis-indicative input, the coach responds with the fixed escalation message rather than an improvised response.
