# Digital Smoking Room — Core Flow Deep Dive

This is the product's core mechanic and its entire reason to exist. Every other screen in the app supports this one. Design intent, screen-by-screen detail for **SCR-09 (Home CTA) → SCR-10 (Craving Check-In) → SCR-11 (Craving Intervention Hub) → SCR-12 (Breathing Exercise) → SCR-14 (Cigarette Selection) → SCR-15 (Quantity Selection) → SCR-16 (Amount Confirmation)**, then a summary handoff into Payment (SCR-17–20, fully specified in `payment-flow.md`).

**Revision note (this pass):** reconciled against PRD v1.1. Three changes matter most: (1) the primary CTA is now the literal phrase **"I WANT TO SMOKE"** (PRD Immutable Rule 4), (2) the Craving Intervention Hub (SCR-11) is rebuilt as a genuine **three-way fork** — breathing, AI coach, and the Digital Smoking Room as equal-weight options — because the previous version of this document demoted the Room to a "Still craving?" link underneath the coping options, which is exactly the funnel pattern PRD Principle 8 rules out, and (3) a standalone Craving Check-In (SCR-10) and Breathing Exercise (SCR-12) screen are added back, since the PRD treats these as real, separate screens with their own data requirements (intensity/trigger capture, a scripted breathing pacer), not sub-states of a merged "Intervention" screen.

**Revision note (latest pass):** SCR-14 (Cigarette Selection) is rebuilt as a full brand-selection screen per an explicit new product requirement — it now supports search, switching brands, "I can't find my brand," custom brand entry, and inline pack price/size configuration with a live cost-per-cigarette calculation, none of which the previous version of this screen had (it only handled the already-saved-profile case). SCR-16 (Amount Confirmation)'s primary CTA label is updated to **"SAVE ₹[amount]"** (uppercase SAVE, matching the emphasis convention already established for "I WANT TO SMOKE") per the same requirement. Nothing else in this document changed — Craving Check-In, the Intervention Hub, Breathing Exercise, and Quantity Selection are unaffected and not redesigned here.

Companion: `design-system.md` for tokens referenced below (`craving.*`, `redirect.*`, `reward.*`).

---

## 0. The Three-Beat Emotional Arc

The brief states the required feeling in three beats. Each beat is deliberately assigned its own **zone color** and its own **screen(s)** so the transition is felt, not just read:

| Beat | User's internal line | Screens | Zone |
|---|---|---|---|
| 1. "I am about to spend money on cigarettes." | Confronting the real cost, honestly, with no judgment | Cigarette Selection (SCR-14, carries the "honest confrontation" beat inline — see below), Quantity Selection, (start of) Amount Confirmation | `craving` → transitioning to `redirect` |
| 2. "Wait — I can redirect this money instead." | The pivot — this is the single most important screen transition in the app | Amount Confirmation (reveal) → UPI Payment Handoff | `redirect` |
| 3. "I actually saved it." | Proof, not a promise | Payment Success | `reward` |

Design rule: **the cigarette-cost math must be shown honestly and specifically before the redirect is offered.** If the app rushes past beat 1 to get to the feel-good beat 3, the mechanic loses its power.

**Why beat 1 no longer has its own dedicated screen:** an earlier version of this design set gave beat 1 a standalone "Digital Smoking Room entry" screen (an interstitial with a headline and a "Continue" tap) before Cigarette Selection. That's now retired — PRD's tap-budget target (`user-flows.md` §3.1: 4 taps or fewer from "Open Smoking Room" to payment handoff for a returning single-profile user) has no room for a screen whose only job is a headline. The honest-confrontation moment is preserved as **hero copy at the top of Cigarette Selection itself** (see SCR-14 below) rather than a screen of its own — same emotional beat, zero extra taps.

---

## SCR-09 (Home) — the craving CTA

**Purpose:** the single most-used entry point in the app. Must be found in under 1 second, in the dark, one-handed. Per PRD §G, two distinct affordances live here, not one — see `user-flows.md` §1 for why both exist.

- **Hierarchy:** Large primary button, positioned in the thumb zone below the streak/wallet summary. A smaller secondary action sits directly beneath it.
- **Components:**
  - **Primary CTA** — full-width, 56dp, `craving.500` fill, flame-spark icon, label **"I WANT TO SMOKE"** (literal, unsoftened, all-caps as PRD Immutable Rule 4 specifies — this is not a design choice to relitigate). One-line supporting caption beneath: *"It's okay. Let's deal with it together."*
  - **Secondary action** — smaller, lower-emphasis text button directly below: *"Open Smoking Room directly"* — for a user who already knows they want to log a save and doesn't want the Check-In/Hub detour. This is a required affordance (PRD §G, `mvp-scope.md` item 5, tested in PRD's own Acceptance Criteria), not optional polish.
- **CTA:** "I WANT TO SMOKE" → Craving Check-In (SCR-10). "Open Smoking Room directly" → Cigarette Selection (SCR-14), skipping Check-In and the Intervention Hub entirely.
- **Navigation:** Both actions live only on Home — there is no nav-bar shortcut into the craving flow (see `design-system.md` §9's retired-FAB note); Home is the sole entry point, matching PRD §H's navigation rule that the primary CTA is "the only entry point into the Craving Check-In → Intervention/Room fork."
- **States:** default; pressed (scale 0.97, 100ms).
- **Accessibility:** `contentDescription` = "I want to smoke — get support with this craving" for the primary button (the visual label stays the literal phrase; the accessible description adds context TalkBack users need that sighted users get from surrounding copy). Minimum 48dp target, both CTAs individually reachable.
- **Microcopy:** the primary CTA's label is fixed — "I WANT TO SMOKE" — never varies, never gets softened to "I'm craving" in any build variant, per `design-system.md` §1 Principle 7.

---

## SCR-10 — Craving Check-In

**Purpose:** quick, low-friction capture of craving intensity/trigger — not a clinical assessment, and not a gate. Feeds the AI Coach's context (if the user later goes there) and Progress/analytics (`craving_intensity_logged`), and nothing else depends on it being filled in.

- **Hierarchy:** full-screen, `craving.100` background.
  1. Headline (H1): *"How's this craving feeling?"*
  2. Intensity control — 3-tap scale (Mild / Strong / Overwhelming), all equal visual weight, none pre-selected.
  3. Optional trigger chips (Stress, Social, After a meal, Boredom, Alcohol, Other) — multi-select, none required.
  4. Primary CTA, always enabled.
- **Components:** headline, 3-tap intensity scale, trigger chip row, "Continue" button.
- **CTA:** *"Continue"* — enabled from the moment the screen loads, with or without any selection (PRD: "speed over data completeness, per Principle 1"). Tapping an intensity option does **not** auto-advance — this screen collects two independent optional signals, so auto-advancing on the first tap would silently drop the trigger tag for users who'd have picked one.
- **Secondary actions:** none.
- **Navigation:** forward → Craving Intervention Hub (SCR-11). Back → Home.
- **States:** default only — fully local, no network dependency to proceed.
- **Error handling:** n/a.
- **Accessibility:** intensity scale and trigger chips are independently reachable via TalkBack swipe; "Continue" is never disabled, so no user is ever blocked here regardless of assistive technology or motor ability.
- **Microcopy:** *"How's this craving feeling?"* — curious, not clinical. No numeric pain-scale register ("rate 1–10"), no diagnostic framing.

---

## SCR-11 — Craving Intervention Hub

**Purpose:** a genuine three-way fork. **This is the screen the previous version of this document got structurally wrong** — it had demoted the Smoking Room to a "Still craving? Go to Digital Smoking Room" link beneath two coping-tool cards, which reads as exactly the "upsell-style intervention before reaching the Smoking Room" that PRD Principle 8 explicitly prohibits. Rebuilt here as three fully equal-weight options.

**Revision (2026-09-16, see `docs/project/DECISIONS.md`): Quick Distraction replaces "Talk to your AI coach" as the third card**, by explicit product decision. This reverses the "What was cut" note this section used to carry — an earlier pass had cut a fourth "Quick distraction" card as unaccounted-for scope creep (no PRD path, no analytics event at the time); it's no longer a bolted-on fourth option, it now occupies the third slot on purpose, with its own PRD section (SCR-11a) and analytics events (`distraction_opened`/`joke_viewed`/`distraction_completed`, `docs/product/analytics.md`). The AI Craving Coach is not removed from the product — it's simply no longer one of this screen's three cards; it remains reachable via its own entry point (Coach tab / floating entry, SCR-13).

- **Hierarchy:** full-screen, `craving.100` background (carried from Check-In).
  1. Headline (H1): *"What do you want to do with this?"*
  2. **Three equal-weight cards, same visual treatment, same size, no default emphasis on any one:**
     1. **60-second breathing exercise** (icon: breathing/wave) → SCR-12.
     2. **Quick Distraction** (icon: sparkle) → SCR-11a, a short list of harmless jokes/prompts — not pre-seeded with craving context (unlike the retired AI coach card), since it's deliberately lightweight and stateless.
     3. **Go to the Digital Smoking Room** (icon: the redirect glyph, `redirect.600` — this card is visually equal to the other two, not a smaller or lower-contrast variant) → SCR-14.
  3. Small, always-visible link at the bottom: *"I already smoked"* → Relapse Log (SCR-21).
- **Components:** three identical-treatment option cards (`el.1`, `radius.md`, equal padding/height), bottom text link.
- **CTA:** none of the three cards is "the" CTA — genuinely equal choice, per Principle 8. **Do not apply `redirect.600` fill or any other visual promotion to the Smoking Room card that isn't also applied to the other two** — this is the one place in the entire design system where the usual zone-color logic (Smoking Room = `redirect` zone) is deliberately suppressed at the card level to keep the fork honest; the Smoking Room's `redirect` zone identity resumes on the very next screen (SCR-14) once the user has made a real choice.
- **Secondary action:** "I already smoked" (routes to Relapse Log directly, bypassing all three cards).
- **Navigation:** back → Craving Check-In (SCR-10). Completing breathing and reporting "I feel better," or returning from Quick Distraction, routes to Home or back to this screen respectively (re-showing the fork after a full resolution would feel like a loop; Quick Distraction has no terminal resolution of its own, so it returns here). Choosing the Smoking Room routes into SCR-14 and follows its own flow.
- **States:** default (static choice screen) only.
- **Error handling:** n/a.
- **Accessibility:** all three cards reachable in the stated order via TalkBack swipe; each announces its own action as a full sentence ("Sixty second breathing exercise" / "Quick distraction" / "Go to the Digital Smoking Room"), not truncated labels.
- **Microcopy:** *"What do you want to do with this?"* — a genuine question, not "Still craving?" (which presupposes the user should have already tried something else) and not "Choose a coping strategy" (which presupposes the Room isn't a legitimate option among equals).

---

## SCR-12 — Breathing Exercise

**Purpose:** a scripted 60–90 second guided breathing intervention — a genuine craving-riding tool, not a stalling tactic before the "real" options.

- **Hierarchy:** full-screen, `craving.100` background.
  1. Animated breathing guide — expanding/contracting circle paced to inhale/hold/exhale, with a synchronized haptic pulse.
  2. Elapsed-time indicator (soft, not a countdown-pressure clock).
  3. On completion (60–90s), two equal-weight outcome buttons appear: **"I feel better"** / **"Still craving."**
- **Components:** breathing pacer animation, elapsed-time indicator, two outcome buttons (appear only at completion).
- **CTA:** the two outcome buttons, shown only once the exercise completes.
- **Secondary actions:** none during the exercise.
- **Navigation:** exit (top-left X) available throughout — exiting mid-exercise logs the craving as **abandoned**, not resolved and not relapsed (same neutral third-outcome category used elsewhere in this design set). "I feel better" → Home, with `craving_resolved` logged. "Still craving" → back to the Intervention Hub (SCR-11), which now offers the coach or the Room next — **never forces a repeat of breathing**, per PRD's explicit rule (`user-flows.md` §2: "a user in the breathing exercise who's still craving after 60 seconds is offered the coach or the Room next, not forced to repeat breathing").
- **States:** in-progress (0–90s, no outcome buttons yet); complete (outcome buttons shown).
- **Error handling:** n/a — fully local animation, no network dependency.
- **Accessibility:** the pacer's inhale/hold/exhale cadence is conveyed by haptic pulse in addition to the visual animation, so it's usable without sustained visual attention. Outcome buttons are standard, clearly labeled, no icon-only ambiguity.
- **Microcopy:** calm, second-person, no urgency language. Outcome buttons stay literally "I feel better" / "Still craving" — no "Did it work?" framing that implies failure if the answer is no.

---

## SCR-14 — Digital Smoking Room: Cigarette Selection (Brand Selection)

**Purpose:** select which cigarette this craving/save is "standing in for" — and carry the honest-confrontation beat (see §0) as this screen's own hero copy, not a separate screen. Keeps the PRD's own screen name ("Cigarette Selection") since that's how it's cross-referenced everywhere else in this design set and in the PRD; "Brand Selection" is how this update's product requirement describes the same screen and is used interchangeably below. Rebuilt this pass from a saved-profile-only picker into a full brand-selection screen: prominent usual brand, search, switch, "can't find it," custom entry, and inline price/pack configuration with a live cost-per-cigarette calculation — while keeping the single-tap fast path for the common returning-user case completely intact.

**The one rule every requirement below answers to (Principle 4, requirement 11 of this update): this must never read as a tobacco shopping or delivery experience.** No brand logos, no packaging photography, no product-grid/card layout, no "popular" or "recommended" sorting, no price comparison across brands, no cart or checkout language anywhere on this screen or its sub-sheets. Every list here is plain text rows — a lookup tool for *your own* habit, not a catalog to browse.

### Default state — the fast path (unchanged in spirit from the previous version)

- **Hierarchy:**
  1. **Hero header** (carries beat 1): small abstract glyph (the schematic cigarette-silhouette-dissolving-into-a-₹-coin icon — used exactly once in the product, right here), one line of honest framing: *"No cigarettes here — just an honest look at what this would cost you."*
  2. **Usual-brand hero card** — large, prominent, single tap target, showing the user's primary saved profile: label (e.g., "My usual — Gold Flake Kings"), pack size, and **cost per cigarette computed from their own reported price** (tabular nums, e.g., *"₹12.50 / stick"*). This is requirement 1 (show the usual brand prominently) — it's not just the first row of a list, it's visually the dominant element on the screen.
  3. Below the hero card, a single low-emphasis line: *"Not this one? Search or add a different brand"* — collapsed by default, expands the fuller picker described below.
- **Auto-advance rule (unchanged):** if the user has exactly one saved profile, the hero card is still shown (briefly, per `user-flows.md` §3.2 — visible-but-fast, not invisible) and auto-advances to Quantity Selection after a short beat unless the user taps the "Not this one?" line or the hero card itself to confirm early. This preserves the tap-budget target for the majority single-profile case — everything described below is reached only when the user actively asks for it.
- **If the user has 2–3 saved profiles:** the hero card shows the *primary* profile (flagged `is_default` in `smoking_profiles`); the other saved profile(s) appear as smaller rows directly beneath it, no auto-advance, since a real choice exists (requirement 3 — allow selecting another brand).

### Expanded state — search, switch, custom entry (requirements 2–6)

Reached by tapping "Not this one? Search or add a different brand," or automatically shown (not collapsed) whenever the user has more than one saved profile.

- **Hierarchy:**
  1. **Search field**, top, placeholder *"Search for a brand"* (requirement 2). As the user types, a filtered plain-text list appears below, matched against a reference brand-name list (names only — no prices, no images; per `foundation-review.md`'s resolved §2.B finding, the old `simulated_products` catalog is repurposed as a **price-less autocomplete list only**, never a pricing source). Selecting a searched result that isn't already one of the user's saved profiles routes straight into the **price & pack-size sheet** below with that brand name pre-filled — the user still has to confirm their own price, because PRD Immutable Rule 3 means no price on this screen is ever anything but self-reported.
  2. **"Your saved brands"** section — the user's existing profile(s), each row showing label + their own cost-per-stick, each with a small edit affordance (pencil icon) that opens the price & pack-size sheet pre-filled with that profile's current values (requirement 6 — configure/update pack price and size, without leaving the craving flow).
  3. **"I can't find my brand"** — a plain, always-visible text link beneath the search results, not hidden behind a "no results" state only (requirement 4). Tapping it opens the price & pack-size sheet with the brand-name field empty and focused, skipping search entirely.
  4. **"Add a custom brand"** — same destination as "I can't find my brand"; both are offered because a user might reach for either phrase depending on whether they searched first or want to skip straight to entry (requirement 5).
- **Components:** search input, filtered plain-text result list, saved-brands list with per-row edit affordance, "I can't find my brand" link, price & pack-size bottom sheet (below).
- **Navigation:** back (from expanded state) → collapses to the default hero-card state, doesn't exit the screen.

### Price & pack-size sheet (requirements 6–7)

A bottom sheet (per `design-system.md` §10's modal pattern — the default for in-context configuration without leaving the current screen), not a new full screen, opened from: a searched-but-unsaved brand, "I can't find my brand," "Add a custom brand," or the edit-pencil on an existing saved profile.

- **Hierarchy:**
  1. Brand name field — pre-filled and editable (searched brand) or empty and focused (custom entry) or pre-filled from the existing profile (edit case).
  2. Price per pack (₹, numeric keypad, tabular nums).
  3. Pack size — chip select: **10 / 20 / Custom** (custom reveals a numeric field for pack sizes outside the two common defaults).
  4. **Live-computed cost per cigarette**, updating on every keystroke: *"= ₹[price ÷ pack size] per cigarette"* (requirement 7 — tabular nums per `design-system.md` §3, no jitter as the numbers change).
  5. Primary action.
- **Components:** brand-name field, currency input, pack-size chip select + custom fallback, live cost-per-cigarette readout, primary button.
- **CTA:** *"Use this brand"* — saves the profile (new or updated) and returns to Brand Selection with it now selected, immediately advancing to Quantity Selection (no extra confirmation screen — the sheet closing *is* the confirmation).
- **Relationship to Smoking Profile Setup (SCR-05) / Smoking Profile Edit (SCR-29):** this sheet is a lightweight, in-context subset of those screens' fields, scoped specifically to unblocking a craving-moment save quickly — it is **not** a replacement for either screen, which remain the full onboarding/settings surfaces for managing profiles at leisure (daily-quantity, brand-type category, deletion, etc. stay there, not here). Neither SCR-05 nor SCR-29 is redesigned by this change.
- **States:** new-brand entry (empty/pre-filled from search); edit-existing (pre-filled from a saved profile, saving here updates that same profile rather than creating a duplicate).
- **Error handling:** price must be > 0 — inline error, "Use this brand" stays disabled until valid (same rule as SCR-05). Pack size must be a positive integer if "Custom" is chosen.
- **Accessibility:** the live cost-per-cigarette readout is a live region, announced as it updates, not just visually updated; brand name field is the initial focus target when the sheet opens from "I can't find my brand" or "Add a custom brand."
- **Microcopy:** *"Use this brand"* not "Add to cart" or "Confirm product" — stays in the same diagnostic register as the rest of the flow.

### Common fields (all states)

- **CTA:** tapping a brand row (usual, saved, or newly-configured via the sheet) **is** the action — advances immediately to Quantity Selection, no separate "Continue" button, preserving the tap-budget target.
- **Navigation:** back → wherever the Room was entered from (Home's secondary action, or the Intervention Hub).
- **States (screen-level):** default/collapsed (hero card, single profile); expanded (search + saved list, multi-profile or user-requested); price & pack-size sheet open (new or edit); empty (no profile set at all — routes to a lightweight inline version of Smoking Profile Setup, then returns here, per PRD, same as before).
- **Error handling:** profile fetch failure → fallback to manual/custom entry via the sheet, never a dead-end blank screen. Brand-name search with no matches shows the plain-text empty state *"No matches — you can still add it as a custom brand"* with the "Add a custom brand" action directly inline, not a separate tap away.
- **Accessibility:** hero card and saved-brand rows are standard selectable-item semantics, announced as "[label], ₹[price] per stick." Search results are announced as a live region (result count updates as the user types). The whole screen's reading order places the hero card before the expandable search section, so a screen-reader user reaches the fast path first, matching the sighted-user visual priority.
- **Microcopy guardrail:** never "Choose your cigarette," "Select product," "Add to order," "Browse brands," or "Shop." The framing stays diagnostic/reflective throughout, including inside the search and custom-entry sub-states — this screen never shows a price the user didn't themselves report (searched-brand names are the one exception, and only as a spelling aid, never carrying a price).

---

## SCR-15 — Digital Smoking Room: Quantity Selection

**Purpose:** how many cigarettes this save represents — down to a **single stick**, and up to a full pack, without typing.

- **Hierarchy:**
  1. H2: *"How many would you have had?"*
  2. Large stepper control, center screen — default value **1**.
  3. **Quick-select chip row: 1 · 2 · 5 · [pack size]** — the fourth chip reads the user's own pack size from their smoking profile (10 or 20, whatever they set in Smoking Profile Setup) and jumps directly to it on tap. This replaces an earlier hard 1–5 cap that made the pack-size chip unreachable — flagged and fixed per foundation review §2.G, which correctly identified that the PRD's own quick-select design ("1, 2, 5, and the user's pack size") was impossible to use against a 5-item stepper ceiling.
  4. Live-updating cost preview beneath the stepper (Body L, tabular nums): *"≈ ₹[X]"* — updates instantly on every tap or chip selection.
- **Components:** stepper (– / value / +, each tap target 48dp), quick-select chip row (4 chips), live cost preview.
- **Range:** the manual stepper is uncapped in the low range (1 upward) and only soft-caps around the user's own pack size plus a small margin (e.g., pack size + 5) rather than a fixed universal ceiling — a hard cross-user cap like "5" doesn't make sense once pack sizes up to 20 are a legitimate, PRD-required selectable value via the chip row.
- **CTA:** *"Continue"* — always enabled (default 1 is valid); tapping a quick-select chip also auto-advances (consistent with SCR-14's low-friction, tap-is-the-action pattern), while the manual stepper still requires an explicit "Continue" since a stepper interaction is inherently exploratory (the user may be adjusting up and down before settling).
- **Secondary actions:** none.
- **Navigation:** back → Cigarette Selection (preserves quantity if the user returns).
- **States:** default (1); chip-selected; stepper-adjusted.
- **Error handling:** n/a.
- **Accessibility:** stepper buttons individually reachable, each announces the resulting value; chips announce their value and, for the pack-size chip, the actual number it represents (e.g., "Pack, 20 sticks") so it isn't a mystery quantity.
- **Microcopy:** *"How many would you have had?"* — past-conditional tense, reinforcing reflection over ordering. The pack-size chip's presence is itself important microcopy: it tells the user this screen takes a full-pack craving as seriously as a single-stick one, rather than silently assuming small quantities only.

---

## SCR-16 — Digital Smoking Room: Amount Confirmation

**Purpose: this is the pivot screen — beat 1 resolves into beat 2 here.** The single most important layout/sequencing decision in the whole flow lives on this screen. It's also where the Savings Destination requirement becomes a hard gate, per PRD §L.

- **Hierarchy (sequenced, not simultaneous — see Motion below):**
  1. **Beat 1 half** (top, `craving.100` tint card): *"[quantity] × ₹[price] = ₹[amount]"* — the honest cost, shown plainly. Sub-line: *"That's what this craving would have cost you."*
  2. **The pivot** (mid-screen, animated reveal ~350ms after screen load): the `craving.100` card visually hands off to a `redirect.100` card sliding up beneath it. Headline (H1) appears with this reveal: *"Redirect it instead?"*
  3. **Beat 2 card** (`redirect.100`): *"₹[amount] → [Savings Destination label]"* with an account/bank icon. Sub-line: *"Straight to your own account — never to a cigarette seller."* This is now literally true (PRD §L's two-leg collect-then-payout mechanism moves the money to the user's own destination account automatically), so the copy says it plainly rather than hedging.
  4. Primary CTA.
- **Components:** two-card stacked layout, primary button, secondary link.
- **CTA:** *"SAVE ₹[amount]"* — uppercase, per the latest product requirement's explicit styling (matches "I WANT TO SMOKE"'s emphasis convention). Button label includes the live amount so the commitment is explicit and specific at the point of tap. (PRD §I's own SCR-16 example was updated to match this uppercase copy on 2026-09-16 — see `docs/project/DECISIONS.md` D-006 — so this is no longer a cross-document divergence, just noted here for context.)
- **Secondary actions:** *"Adjust quantity"* (ghost text link) → back to Quantity Selection, amount recalculates live on return.
- **Hard gate — no Savings Destination configured:** per PRD Functional Requirement 5 and §L.1, a payment **cannot** be initiated without a known, verified Savings Destination. If none is set (the user skipped SCR-07 at onboarding and hasn't added one since), the beat-2 card and primary CTA are **replaced inline** by a compact destination-setup prompt: *"Where should this go? Add your savings destination to continue."* with a single CTA into a lightweight version of Savings Destination Setup (see `quit-wallet.md` §Savings Destination). Critically, the user's brand/quantity selection is preserved — completing destination setup returns them straight to a ready-to-pay Amount Confirmation, not back to the start of the Smoking Room (`user-flows.md` §3.2 is explicit about this: "the quantity/brand selection state is preserved").
- **Navigation:** forward → UPI Payment Handoff (SCR-17). Back → Quantity Selection.
- **States:** loading-in (staged reveal, plays once per visit); static (post-animation resting state); **destination-not-set** (inline prompt replaces the pay action, described above) — this is a distinct, named state, not folded into a generic "error."
- **Error handling:** destination-not-set is handled as above, not as an error toast — it's an expected, common first-payment state, not a failure.
- **Accessibility:** the staged reveal is decorative; TalkBack receives both cards' content immediately and in full on screen load; reduce-motion users get both cards static/simultaneous.
- **Microcopy:** *"Redirect it instead?"* is the literal sentence the brief's beat 2 ("Wait — I can redirect this money instead") is built around — keep this phrase intact.

---

## Handoff to Payment (SCR-17–20)

Amount Confirmation's CTA carries the confirmed amount and destination (locked, non-editable from this point) into UPI Payment Handoff. Full detail — the two-leg collect-then-payout mechanics, pending/timeout handling, success reinforcement (beat 3), and failure recovery including the new payout-leg failure mode — is specified in `payment-flow.md`. Summary of how the three-beat arc completes:

- **UPI Payment Handoff / Payment Processing** (SCR-17–18): still `redirect` zone — the user is actively following through on the beat 2 decision. SCR-18 has no exit at all (PRD §H) while the collection-leg request is in flight.
- **Payment Success** (SCR-19): **beat 3 lands here** — `reward` zone, the Quit Wallet balance visibly increases as soon as the *collection* leg is confirmed (not gated behind full payout settlement). See `payment-flow.md` §Success for the full reinforcement spec and how it discloses the (usually invisible) payout leg still finishing in the background.
- **Payment Failure** (SCR-20): a **technical** failure of the collection leg (UPI timeout, bank decline, user cancellation) — three distinct sub-states (failed / cancelled / pending-unconfirmed), never framed as "you failed to quit." See `payment-flow.md` §Failure. Note: a *payout-leg* failure is a structurally different, later, async event that does **not** route through SCR-20 at all — see `payment-flow.md` §Payout-leg failure.

---

## Abandonment Handling (cross-screen rule)

If the user exits the Digital Smoking Room sequence anywhere **after** Quantity Selection (i.e., a real number has been computed) without completing payment:

- Confirm-dismiss prompt: *"Leave without saving? Your ₹[amount] won't be redirected this time."* — factual, not guilt-inducing.
- Two options: *"Keep going"* (primary, returns to where they were) / *"Leave"* (secondary/ghost).
- On leave: craving event is logged as **abandoned**, not as relapse and not as resisted — a neutral third outcome that feeds Progress trends but never penalizes the streak.
- No re-prompt/nag on the next app open about the abandoned session.
