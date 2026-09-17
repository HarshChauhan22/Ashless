# Screen Specifications — Full Inventory (33 Screens)

Master reference, numbered per PRD `SCR-xx` IDs (see `ux-flow.md` §1/§5 for the full inventory and zone map). Screens with deep-dive treatment elsewhere are summarized here with a pointer; all other screens are fully specified below using the same field structure: **Hierarchy · Components · CTA · Secondary actions · Navigation · States · Error handling · Accessibility · Microcopy**.

**Revision note (this pass):** reconciled against PRD v1.1 (canonical). Added: Age Verification (at the time, a gap-fill not in PRD's own numbering — since backfilled as **SCR-04A**, see the note below and `docs/project/DECISIONS.md`), SCR-06 Quit Motivation & Goal Selection, SCR-08 Notification Permission Priming, SCR-26 Cigarettes Avoided Detail, and split what was previously one merged "Profile/Settings" screen into SCR-28 (hub) + SCR-29 (Smoking Profile Edit) + SCR-31 (Account & Privacy) + SCR-32 (Help & Support). SCR-03/SCR-04 (previously one merged "Login/Signup" screen) are now specified separately, matching the PRD's own split. SCR-07/SCR-30 (Savings Destination) are fully specified in `quit-wallet.md`, not here. SCR-09–21 (the full craving→payment→wallet core loop) are specified in `digital-smoking-room.md` and `payment-flow.md`, not duplicated here.

**Revision note (latest pass):** SCR-14 expanded into a full brand-selection screen (search, switch, custom entry, inline price/pack configuration) — see `digital-smoking-room.md` for the full spec. A one-line cross-reference was added to SCR-05 and SCR-29 below, noting the new in-context quick-edit affordance SCR-14 now offers; neither SCR-05 nor SCR-29 itself was redesigned.

Deep-dived elsewhere (do not duplicate — see linked doc):
- **SCR-09 (Home CTA), SCR-10 Craving Check-In, SCR-11 Craving Intervention Hub, SCR-12 Breathing Exercise, SCR-14 Cigarette Selection (Brand Selection), SCR-15 Quantity Selection, SCR-16 Amount Confirmation** → `digital-smoking-room.md`
- **SCR-17 UPI Payment Handoff, SCR-18 Payment Processing, SCR-19 Payment Success, SCR-20 Payment Failure/Retry, + the payout-leg failure path** → `payment-flow.md`
- **SCR-07 Savings Destination Setup, SCR-22 Quit Wallet, SCR-23 Savings History, SCR-24 Savings Goals, SCR-30 Payment & Savings Destination Settings** → `quit-wallet.md`

Fully specified below: **SCR-01, SCR-02, SCR-03, SCR-04, SCR-04A, SCR-05, SCR-06, SCR-08, SCR-09 (Home, general layout — CTA specifics cross-referenced), SCR-13, SCR-21, SCR-25, SCR-26, SCR-27, SCR-28, SCR-29, SCR-31, SCR-32.**

---

## SCR-01 — Splash

- **Hierarchy:** Single element, centered — Ashless wordmark/symbol on `surface.50`. Nothing else. No loading spinner unless load genuinely exceeds ~800ms.
- **Components:** App mark, centered, 25% viewport height.
- **CTA:** none — auto-advances.
- **Secondary actions:** none.
- **Navigation:** auto-routes on session state — no session → Onboarding Carousel; session + incomplete first-run onboarding → resumes at the first incomplete step; session + onboarding complete → Home. Target <1.5s (PRD §I).
- **States:** loading → routed.
- **Error handling:** session check failure routes to Phone Entry silently, no error dialog on launch.
- **Accessibility:** transient; app name announced once.
- **Microcopy:** none needed.

---

## SCR-02 — Onboarding Carousel

- **Hierarchy:** 3 sequential full-screen cards, swipe/tap-through, progress dots at top.
- **Components:** progress dots (`redirect.600` active), illustration area, headline (H1), body line, "Skip" (ghost, top-right), "Next"/"Get Started" (primary, bottom).
- **Card sequence (per PRD §I SCR-02 exactly):**
  1. *"Every cigarette you skip, you get richer."* — core value prop, no product screenshots.
  2. How the Digital Smoking Room works — 3-icon strip (craving → redirect → reward), names the feature.
  3. *"Your money, your bank — we never hold your savings hostage."* — trust framing for the payment step ahead, sets expectations before Savings Destination Setup asks for anything.
- **CTA:** "Next" through cards 1–2; card 3 CTA is "Get Started" → Phone Entry.
- **Secondary actions:** "Skip" (any card) → Phone Entry directly.
- **Navigation:** swipe or tap-through; back-swipe to previous card until card 1, where back exits to system.
- **States:** card 1/2/3 (progress dots).
- **Error handling:** n/a.
- **Accessibility:** each card's heading is the TalkBack focus target on arrival; progress announced as "Step 2 of 3."
- **Microcopy:** warm, direct — not clinical, not hype-gamified.

---

## SCR-03 — Phone Entry

- **Hierarchy:** single screen. Headline, phone input, consent line, primary CTA.
- **Components:** `+91` prefix locked (India-only MVP), 10-digit numeric input, consent line linking Privacy Policy & Terms, "Send OTP" button.
- **CTA:** "Send OTP" — disabled until 10 valid digits.
- **Secondary actions:** none.
- **Navigation:** forward → OTP Verification. Back → Onboarding Carousel.
- **States:** empty (default, disabled CTA); loading (spinner while OTP send in flight); error (invalid format → inline; send failure → toast with retry, no navigation change); success → SCR-04.
- **Error handling:** as above — send failures never lose the entered number.
- **Accessibility:** input labeled explicitly ("Phone number, 10 digits"); consent line links individually reachable.
- **Microcopy:** pure utility, no marketing copy — get the user through quickly.

---

## SCR-04 — OTP Verification

- **Hierarchy:** 6-digit OTP input (per `design-system.md` §8 — 6 discrete boxes, auto-advance), countdown + Resend, edit-number link.
- **Components:** OTP box row (auto-read via Android SMS Retriever API where available), countdown timer, "Resend OTP" (enabled after 30s), "Edit number" link, fallback "Verify" button for manual entry.
- **CTA:** auto-submits on the 6th digit; "Verify" button available as a manual fallback.
- **Secondary actions:** "Resend OTP" (post-cooldown); "Edit number" → back to Phone Entry, resets the send.
- **Navigation:** success → Age Verification (new user) or Home (returning user with complete onboarding). Back → Phone Entry.
- **States:** loading (verifying); error (wrong OTP → inline, boxes clear and refocus first box, does not navigate away; expired → prompt resend); success.
- **Error handling:** rate-limit hit → *"Too many attempts. Try again in [X] minutes,"* submit disabled for that window.
- **Accessibility:** OTP boxes announced as one grouped field, not six unlabeled inputs; errors are live-region announced.
- **Microcopy:** as terse as SCR-03 — this is the second of two pure-utility auth screens.

---

## SCR-04A — Age Verification

Positioned immediately after OTP Verification, before any product data collection, since eligibility should be confirmed before profile/motivation data is gathered, not after. Required by PRD §IX.8; `database-schema.md` has a `date_of_birth` column; `security.md` enforces server-side rejection of under-18 dates. Formally adopted into the PRD's own numbering as **SCR-04A** (decision 2026-09-16, see `docs/project/DECISIONS.md`) — this screen's spec is unchanged from the earlier gap-fill version, only its ID status changed.

- **Hierarchy:**
  1. Headline (H1): *"How old are you?"*
  2. Short context line: *"Ashless is built for adult smokers. We ask so we can keep it that way."*
  3. Date-of-birth input (native Android date picker, not three free-text fields — reduces entry error).
  4. Primary CTA.
- **Components:** headline, context line, date picker, "Continue" button.
- **CTA:** "Continue" — enabled once a valid date is entered.
- **Secondary actions:** none — this step cannot be skipped (PRD Functional Requirement 14 explicitly excludes phone/OTP auth from the "resumable/skippable" rule; age-gating sits in the same non-negotiable category since it's a safety/compliance baseline, not a product-completeness one).
- **Navigation:** forward → Smoking Profile Setup (SCR-05). No back to auth (consistent with PRD's onboarding navigation pattern — a later back press exits onboarding only with a confirmation, not a return to phone/OTP).
- **States:** default (empty); valid (≥18, proceeds); **under-18 block** — a calm, firm, non-punitive full-screen message: *"Ashless is built for adult smokers 18 and older. We're not able to continue right now."* No further input, no retry-with-a-different-date loop, no aggressive "get out" tone — just a clear, final stop consistent with the product's overall no-shame voice even in the one place it has to say no.
- **Error handling:** invalid/future date → inline validation error, no submission possible.
- **Accessibility:** the under-18 block screen is announced clearly and completely on arrival — this is a terminal state for the session, and a screen-reader user should understand that immediately, not have to explore the screen to find out there's no way forward.
- **Microcopy:** direct, not apologetic, not moralizing — this is a factual eligibility gate, stated once, plainly.

---

## SCR-05 — Smoking Profile Setup

**Mandatory, first-run, gates Home.** Everything the Digital Smoking Room calculates depends on accurate data here — load-bearing, not a throwaway form.

- **Hierarchy:** short multi-step form (progress indicator), one question per step.
  1. **What do you usually smoke?** Searchable brand/type picker (common cigarette brands sold in India) with an "Other / not listed" free-text fallback — matches PRD §I SCR-05 exactly (a prior version of this design used a generic category picker only; the PRD calls for an actual searchable brand list with a free-text escape hatch, which this design now follows).
  2. **What does it cost you?** Price-per-stick and/or price-per-pack input (pack size default 10 or 20, editable) — the live price-per-stick computation shown beneath the fields is the number the whole product runs on (PRD Immutable Rule 3).
  3. **How many a day, on average?** Slider or stepper.
  4. **"I smoke more than one brand"** toggle — adds a second profile inline, supported from MVP (PRD Functional Requirement 2, `mvp-scope.md` item 2 — single-stick/multi-brand culture is core, not deferred).
- **Components:** step progress bar, searchable brand picker, currency inputs, pack-size toggle, quantity stepper, multi-profile toggle, "Continue" per step.
- **CTA:** "Continue" per step; final step reads *"Finish setup"* is not used here — Smoking Profile Setup is one step in a longer onboarding chain, so the final step's CTA is plain "Continue" → SCR-06.
- **Secondary actions:** "I smoke more than one brand" (adds a profile).
- **Navigation:** linear, back allowed within steps; resumable if backgrounded (PRD Functional Requirement 14).
- **States:** step 1/2/3; validation-blocked (missing required field); complete.
- **Error handling:** price must be > 0 — inline error, no silent zero-cost profiles. Brand field has no hard validation beyond non-empty (free text via "Other" is always valid).
- **Cross-reference:** SCR-14 (Brand Selection, in `digital-smoking-room.md`) now also offers a lightweight, in-context version of steps 1–2 above (brand search/custom entry + price/pack-size) so a user can unblock a craving-moment save without leaving the Digital Smoking Room. That in-flow sheet is a subset of this screen's fields, not a replacement — this screen remains the full setup surface (including the daily-quantity step and multi-profile toggle above, neither of which the in-flow sheet duplicates).
- **Accessibility:** step progress announced; currency fields labeled explicitly with ₹ read as "rupees."
- **Microcopy:** diagnostic, never judgmental — *"What does it cost you?"* not *"How much do you waste?"*

---

## SCR-06 — Quit Motivation & Goal Selection

- **Hierarchy:**
  1. Headline (H1): *"What's this for?"*
  2. Multi-select chips: Health, Money, Family, Fitness, Smell/appearance, Other (free-text).
  3. Target framing toggle: **"Cut down"** vs **"Quit completely"** — both fully supported goals, not just abstinence (PRD explicitly includes harm-reduction users in scope).
  4. Primary CTA.
- **Components:** headline, multi-select chip row, two-option toggle, "Continue" button.
- **CTA:** "Continue" — enabled even with zero selections (this step must not block onboarding, per PRD).
- **Secondary actions:** none.
- **Navigation:** forward → Savings Destination Setup (SCR-07, see `quit-wallet.md`). Back → Smoking Profile Setup.
- **States:** empty (valid, proceeds); selections made.
- **Error handling:** n/a — nothing here can fail.
- **Accessibility:** chips are standard multi-select semantics, each independently toggleable and announced.
- **Microcopy:** used only to personalize later copy (e.g., referencing "your family" in a milestone message if selected) — never used for medical/clinical logic, and the UI should not imply otherwise.

---

## SCR-08 — Notification Permission Priming

- **Hierarchy:**
  1. Explanation copy: *"We'll check in during cravings and celebrate your wins — nothing else."*
  2. An illustrative example notification (static mock, not a live one).
  3. Two actions.
- **Components:** explanation copy, example-notification card, "Allow Notifications" (triggers the OS permission dialog), "Not now" (skips, revisitable from Settings).
- **CTA:** "Allow Notifications."
- **Secondary actions:** "Not now."
- **Navigation:** → Home regardless of the permission outcome (both granted and denied are valid completed states) — onboarding is now complete.
- **States:** success (granted or denied — both terminal-and-fine); error N/A.
- **Error handling:** n/a.
- **Accessibility:** the example-notification mock is marked decorative/non-interactive for TalkBack so it isn't mistaken for a real, tappable notification.
- **Microcopy:** honest about scope — "check in during cravings and celebrate your wins" is a specific, bounded promise, not a vague "stay engaged" pitch, so the permission request feels earned rather than generic.

---

## SCR-09 — Home (general layout)

**CTA specifics (the primary "I WANT TO SMOKE" button and the secondary "Open Smoking Room directly" action) are fully specified in `digital-smoking-room.md`** — this entry covers the rest of the screen's layout.

- **Hierarchy (top to bottom):**
  1. Top bar: time-of-day-aware greeting + notification bell (top-right).
  2. **Streak summary** — Streak ring (`design-system.md` §6), largest element, above the fold.
  3. **Today's saved amount** — Stat card, `reward.600` accent, directly beneath.
  4. **Craving CTAs** — see `digital-smoking-room.md` SCR-09 section, positioned in the thumb zone, always visible without scrolling.
  5. Below the fold: active Savings Goal progress (tap → SCR-24), AI Coach entry banner, relapse-log low-emphasis link (*"Smoked instead? Log it here — no judgment."*), and — if unset — the **"Add your savings destination"** banner (PRD §I SCR-09).
- **Components:** greeting header, notification bell, Streak ring, Stat card, primary + secondary craving CTAs (see cross-ref), Goal progress card, AI Coach banner, relapse text link, destination-missing banner (conditional), bottom nav.
- **CTA:** see `digital-smoking-room.md`.
- **Secondary actions:** notification bell → SCR-27; Goal card → SCR-24; AI Coach banner → SCR-13; relapse link → SCR-21; destination banner → lightweight Savings Destination setup.
- **Navigation:** bottom nav root, default landing screen post-onboarding.
- **States:** first-run (Day 0, "₹0 saved so far" — copy: *"Your streak starts now,"* never framed as a deficient state); ongoing (populated); post-relapse (Streak ring freshly reset, Total saved elsewhere in the app unaffected per the ledger's own integrity rules).
- **Error handling:** stats fetch failure → last cached values with a subtle "updating…" indicator, never a blocking error on Home.
- **Accessibility:** greeting + streak read first; craving CTAs remain reachable within the first few swipes regardless of below-the-fold content length.
- **Microcopy:** warm but grounded, not falsely cheerful on a hard day.

---

## SCR-13 — AI Craving Coach Chat

- **Hierarchy:** full-screen chat. Top bar: "AI Coach" + close (X). Message thread (user right, coach left). Bottom: text input + send, contextual quick-reply chips above input.
- **Components:** chat bubbles, quick-reply chip row (e.g., "It's about stress," "I want to smoke anyway," "I feel fine now" — PRD's exact chip set), text input, send button, typing indicator, persistent small-print disclaimer.
- **CTA:** "Send" / quick-reply chips.
- **Secondary actions:** always-visible **"Go to Smoking Room instead"** and **"I already smoked"** shortcuts (PRD: "the chat is never a dead end") — these persist through the entire conversation, not just at the start.
- **Navigation:** entry points: Intervention Hub (SCR-11, one of three equal cards — see `digital-smoking-room.md`), a floating entry point on Home, the Coach tab in bottom nav. Close (X) returns to entry-point context.
- **States:** empty/first-open (coach sends an opening message proactively, referencing the Check-In's intensity/trigger if provided — never a blank box waiting on the user); active conversation; coach-typing; offline/unavailable (see error handling).
- **Error handling:** backend unreachable → calm inline fallback message in the thread itself, with the two shortcut actions still fully functional — never a blocking dialog, never a dead end (PRD Functional Requirement 12, Acceptance Criteria).
- **Accessibility:** each message announced with sender attribution; typing indicator announced via live region.
- **Microcopy:** supportive peer/counselor register, persistent disclaimer: *"I'm an AI coach — here to support you, not to replace medical advice."* Crisis-language detection routes to a fixed, reviewed escalation message (PRD §IX.3), never an improvised response.

---

## SCR-21 — Relapse Log

**The most important tone-setting screen in the app outside the core loop.** Must never feel like a confession booth.

- **Hierarchy:**
  1. Headline (H1): *"You smoked. That's okay — let's log it and keep going."*
  2. Quantity smoked (stepper, supports partial/single sticks).
  3. Optional trigger chips (reuses Craving Check-In's set).
  4. Transparency statement: *"Your streak will reset to 0. Your total savings of ₹[X] stay exactly where they are."* — states this plainly before confirming, building trust.
  5. Primary CTA.
- **Components:** headline, quantity stepper, optional trigger chips, transparency statement card, "Log and continue" button, secondary link to AI Coach.
- **CTA:** *"Log and continue"* → applies streak reset, returns to Home.
- **Secondary actions:** *"Talk to AI Coach about this"* (ghost link) → SCR-13, pre-seeded, offered but never gating the log action.
- **Navigation:** entry points: Home (low-emphasis link), Intervention Hub ("I already smoked"), AI Coach chat shortcut. Always exits to Home.
- **States:** default (entry); confirmed (brief neutral "Logged." acknowledgment, ~1.5s, before auto-advancing — not a celebratory animation).
- **Error handling:** n/a — all fields optional, nothing to validate, cannot fail to submit.
- **Accessibility:** headline read first; the transparency statement is read in full, since it's the most trust-critical sentence on the screen.
- **Microcopy:** no shame language anywhere — "You smoked" stated plainly once, then the copy moves to forward-looking, practical information.

---

## SCR-25 — Progress / Stats

- **Hierarchy:**
  1. Time-range selector (Week / Month / All time).
  2. Streak calendar/heatmap.
  3. Cigarettes avoided summary (→ SCR-26 detail).
  4. Money saved summary (mirrors SCR-22's headline).
  5. Milestone markers (e.g., "3 days smoke-free," "₹500 saved") — generic, non-clinical framing, no invented health-recovery percentages (PRD §IX.1).
- **Components:** time-range control, calendar/heatmap, summary cards, milestone marker list.
- **CTA:** none screen-level; drill-in to SCR-26.
- **Secondary actions:** time-range toggle.
- **Navigation:** Progress tab (bottom nav).
- **States:** sufficient-data (normal); insufficient-data (first week) → friendly placeholder, not a blank chart.
- **Error handling:** chart data load failure → skeleton shape with retry, never a blank chart area (could misread as zero activity).
- **Accessibility:** a "View as list" toggle presents the same data as a table for screen-reader users, since trend visuals are inherently hard to convey via TalkBack alone.
- **Microcopy:** relapse data uses the same neutral tone as everywhere else — *"Days smoked: 3"* not punitive framing.

---

## SCR-26 — Cigarettes Avoided Detail

- **Hierarchy:**
  1. Headline: the total avoided count, large, with a **definition tooltip** explaining exactly how it's calculated (PRD Functional Requirement 9 — this must be transparent, not a black box).
  2. Breakdown chart/list by period (day/week).
  3. Breakdown by trigger tag, when logged during Check-In/Relapse Log.
- **Components:** headline with tooltip icon, period breakdown chart/list, trigger-tag breakdown.
- **CTA:** none primary.
- **Secondary actions:** tooltip tap → definition sheet: *"Calculated from your usual daily quantity × smoke-free time, minus any logged relapses."* (or whatever the actual documented formula is — the point is it's stated plainly, not asserted as an unexplained number).
- **Navigation:** back → Progress (SCR-25).
- **States:** loading; empty (*"Avoid your first cigarette to see this fill in"*); error; populated.
- **Error handling:** standard skeleton-and-retry pattern.
- **Accessibility:** the definition tooltip's content is reachable via TalkBack as ordinary text, not trapped in a hover-only affordance (there's no hover on mobile, but worth stating explicitly: it must be a tappable, screen-reader-reachable element).
- **Microcopy:** the transparency of the formula is itself the design — this screen exists specifically so "cigarettes avoided" never feels like a mystery number.

---

## SCR-27 — Notifications Center

- **Hierarchy:** full-screen list, reverse-chronological, grouped by Today/Earlier. Each row: icon, title, timestamp, brief body, read/unread dot.
- **Components:** grouped list, notification rows, empty state.
- **Notification types:** craving check-in nudge (`craving` tone, capped frequency — never nagging), milestone earned (`reward`/`gold` tone), goal progress, **payment-status update** — including the payout-leg-failure case (*"Your last save didn't complete"* — see `payment-flow.md` §Payout-leg failure, deep-links directly to the Savings History transaction detail, not a generic list item), AI Coach follow-up.
- **CTA:** none screen-level; each row deep-links to source context.
- **Secondary actions:** "Mark all read"; per-row swipe-to-dismiss.
- **Navigation:** bell icon on Home → this screen. Back → Home.
- **States:** populated; empty (*"Nothing here yet."*); all-read.
- **Error handling:** load failure → skeleton list + retry.
- **Accessibility:** unread state conveyed by more than the dot alone (bolder text weight too); each row announces read/unread status.
- **Microcopy:** craving check-in nudges are offers, never demands — *"Feeling anything right now? We're here if you need us."* Capped at roughly 1–2 proactive check-ins per day so the app itself doesn't become a source of anxiety.

---

## SCR-28 — Profile & Settings

- **Hierarchy:**
  1. User identity block (phone, member since).
  2. Grouped settings list: Smoking Profile (→ SCR-29), Payment & Savings Destination (→ SCR-30, see `quit-wallet.md`), Notifications (frequency/type toggles), AI Coach (→ SCR-13), Relapse Log (→ SCR-21), Account & Privacy (→ SCR-31), Help & Support (→ SCR-32), Log out.
- **Components:** identity header, grouped list sections with standard row chrome.
- **CTA:** none screen-level — settings hub, not a task flow.
- **Secondary actions:** each row navigates to its own sub-screen.
- **Navigation:** Profile tab (bottom nav).
- **States:** default.
- **Error handling:** n/a at this level (handled per sub-screen).
- **Accessibility:** grouped list uses standard section-header semantics.
- **Microcopy:** neutral, utilitarian — this screen doesn't need to carry brand voice the way core-loop screens do.

---

## SCR-29 — Smoking Profile Edit

- **Hierarchy/UI:** same fields as SCR-05, editable, supports multiple brand profiles, supports deletion of a profile — with a warning (not a hard block) if it's the only one, since the Smoking Room needs at least one profile or a one-off manual entry path.
- **CTA:** "Save changes."
- **States:** standard Loading/Error/Success; Empty N/A (editing existing data).
- **Error handling:** same price-validation rule as SCR-05 (must be > 0).
- **Navigation:** back → SCR-28.
- **Microcopy:** same diagnostic, non-judgmental tone as SCR-05 — editing this data later shouldn't feel more scrutinized than setting it up the first time.
- **Cross-reference:** the per-profile edit affordance on SCR-14 (Brand Selection) opens a lightweight price/pack-size-only sheet, not this screen — it updates the same underlying profile record, but a user wanting to change their daily-quantity figure, brand-type category, or delete a profile still needs to come here.

---

## SCR-31 — Account & Privacy

- **Hierarchy/UI:** data export request, account deletion request, consent management, link to privacy policy.
- **CTA:** "Export my data" / "Delete account" (destructive, confirmation required).
- **States:** standard pattern; account deletion states plainly what happens to historical savings records (PRD §IX.5, `database-schema.md` retention rules).
- **Error handling:** deletion confirmation must clearly state consequences before the destructive action executes, not after.
- **Navigation:** back → SCR-28.
- **Accessibility:** destructive actions require an explicit secondary confirmation step, never a single accidental tap.
- **Microcopy:** plain, factual — smoking status and craving data are sensitive personal data under DPDP Act 2023 expectations, and this screen is where that's made concrete for the user, not just asserted in a privacy policy they'll never read.

---

## SCR-32 — Help & Support

- **Hierarchy/UI:** FAQ, contact/support channel, the quit-helpline resource required by PRD §IX.3 (verify the current number pre-launch — not asserted as fact in this design set), payment dispute/refund request entry point (routes into the reconciliation process described in `payment-flow.md`).
- **CTA:** "Contact support" / "Report a payment issue."
- **States:** standard pattern.
- **Error handling:** n/a beyond standard support-ticket submission states.
- **Navigation:** back → SCR-28.
- **Microcopy:** the helpline resource is presented plainly and prominently, not buried — this is a safety-relevant entry point, not a generic FAQ link.
