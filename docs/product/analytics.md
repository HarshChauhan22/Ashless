# Analytics & Metrics — Digital Smoking Room

Companion to [PRD.md](./PRD.md). Screen IDs (SCR-xx) match the PRD.

---

## T. Analytics Events

Naming convention: `snake_case`, past-tense verb for completed actions, `_started` for entry into a multi-step flow. Every event below lists trigger, key properties, and the screen(s) it fires from. Properties marked **required** must never be null/omitted; properties marked optional may be absent (e.g., user skipped an optional field).

### Craving & Intervention

| Event | Trigger | Key properties | Screen |
|---|---|---|---|
| `craving_started` | User taps "I WANT TO SMOKE" on Home | `entry_point` (required: `home_primary_cta`), `timestamp` | SCR-09 → SCR-10 |
| `craving_intensity_logged` | User sets/skips intensity on Check-In | `intensity` (optional), `trigger_tag` (optional) | SCR-10 |
| `intervention_path_selected` | User picks an option on the Intervention Hub | `path` (required: `breathing`/`quick_distraction`/`smoking_room`/`relapse_log`) | SCR-11 — **revised 2026-09-16** (DECISIONS.md): `ai_coach` removed from this specific enum since it's no longer one of the Hub's three cards (AI Coach is still a product surface, just reached elsewhere — see `ai_coach_message_sent` etc. below, unchanged) |
| `craving_intervention_started` | User begins breathing exercise or Quick Distraction | `intervention_type` (required: `breathing`/`quick_distraction`) | SCR-12, SCR-11a |
| `distraction_opened` / `joke_viewed` / `distraction_completed` | Quick Distraction opened / a joke is shown / user returns to craving options | `cravingSessionId` (required); `jokeIndex` (required on `joke_viewed`) | SCR-11a |
| `craving_resolved` | User reports feeling better without a payment or relapse | `intervention_type` (required), `duration_seconds` (required) | SCR-12, SCR-13 |
| `craving_abandoned` | User exits an intervention without resolving or converting | `intervention_type` (required), `duration_seconds` (required) | SCR-12, SCR-13 |
| `ai_coach_message_sent` | User sends a chat message | `message_index` (required, position in session) | SCR-13 |
| `ai_coach_response_failed` | AI response errors/times out | `error_type` (required) | SCR-13 |
| `ai_coach_escalation_triggered` | Crisis-language guardrail fires | none beyond `timestamp` (no message content logged, to avoid storing sensitive free text unnecessarily) | SCR-13 |

### Digital Smoking Room

| Event | Trigger | Key properties | Screen |
|---|---|---|---|
| `smoking_room_opened` | User enters the Room, from either entry point | `entry_point` (required: `intervention_hub`/`home_direct`) | SCR-14 |
| `cigarette_selected` | Brand/profile chosen | `profile_id` (required), `selection_source` (required: `usual`/`recent`/`search`/`custom_new`) | SCR-14 |
| `brand_search_performed` | User types into the Brand Picker search field | `query_length` (required — length only, never the raw query text, to avoid logging free-text PII), `result_count` (required) | SCR-14 |
| `custom_brand_created` | "I can't find my brand" flow completes and a new profile is created | `profile_id` (required), `pricing_mode` (required: `pack`/`single_stick`), `entry_point` (required: `smoking_room`/`onboarding`) | SCR-14, SCR-05 |
| `quantity_selected` | Quantity confirmed | `quantity` (required, integer ≥1), `is_single_stick` (required, `quantity == 1`) | SCR-15 |
| `amount_previewed` | Amount confirmation screen rendered with computed total | `amount_inr` (required), `quantity` (required), `profile_id` (required) | SCR-16 |
| `savings_destination_missing_prompted` | User hits the inline destination-required prompt | none beyond `timestamp` | SCR-16 |
| `savings_intent_created` | User taps the amount/action bar | `savings_intent_id` (required), `amount_inr` (required), `quantity` (required), `profile_id` (required) | SCR-16 |
| `payment_started` | Payment Transaction created, UPI handoff initiated | `savings_intent_id` (required), `payment_provider_txn_ref` (required) | SCR-17 |
| `payment_processing_shown` | Processing screen rendered (waiting on confirmation) | `savings_intent_id` (required) | SCR-18 |
| `payment_success` | Backend confirms payment and ledger write completes | `savings_intent_id` (required), `ledger_entry_id` (required), `amount_inr` (required) | SCR-18 → SCR-19 |
| `payment_failed` | Backend confirms failure (not cancellation) | `savings_intent_id` (required), `failure_reason` (required) | SCR-20 |
| `payment_cancelled` | User backs out of UPI app / declines | `savings_intent_id` (required) | SCR-20 |
| `payment_pending` | Timeout reached without confirmation, routed to pending state | `savings_intent_id` (required) | SCR-20 |
| `payment_pending_resolved` | Async reconciliation resolves a pending payment | `savings_intent_id` (required), `resolution` (required: `success`/`failed`), `resolved_via` (required: `webhook`/`reconciliation_job`) | SCR-27 (notification) |
| `payment_retry_started` | User taps "Try again" from SCR-20 | `original_savings_intent_id` (required), `new_savings_intent_id` (required) | SCR-20 |
| `payment_duplicate_detected` | Reconciliation flags a duplicate charge | `savings_intent_id` (required), `duplicate_payment_provider_txn_ref` (required) | backend/reconciliation |
| `refund_initiated` | Refund process starts (duplicate, dispute, or support-confirmed error) | `savings_intent_id` (required), `reason` (required: `duplicate`/`user_dispute`/`error_correction`) | backend/SCR-32 |

### Savings (Ledger) — user-facing outcome of a successful payment

| Event | Trigger | Key properties | Screen |
|---|---|---|---|
| `savings_recorded` | Ledger Entry written (fires alongside `payment_success`, but represents the ledger/product-state change specifically, distinct from the payment-provider event) | `ledger_entry_id` (required), `amount_inr` (required), `new_wallet_balance_inr` (required), `cigarettes_avoided_delta` (required) | backend, surfaced on SCR-19 |
| `payout_succeeded` | Payout leg confirms complete (PRD §L.5a) — the collected amount actually reached the user's own Savings Destination | `savings_intent_id` (required), `payout_provider_txn_ref` (required), `latency_ms` (required — elapsed time from collection confirmation to payout completion, watched as an infra-health signal) | backend only, silent (no user-facing screen — SCR-19 already showed success at collection time per PRD §L.4) |
| `payout_failed` | Payout leg exhausts its bounded retries and terminally fails (PRD §L.5a) — triggers the auto-refund-and-reverse path | `savings_intent_id` (required), `failure_reason` (required), `refund_initiated` (required, boolean) | backend, surfaces to the user via SCR-27 notification and a reversal row in SCR-23 (`payment-flow.md` §Payout-leg failure) |
| `savings_goal_created` | User creates a goal | `goal_id` (required), `target_amount_inr` (required) | SCR-24 |
| `savings_goal_progress_viewed` | User opens a goal detail | `goal_id` (required), `percent_complete` (required) | SCR-24 |
| `wallet_viewed` | Wallet screen opened | `wallet_balance_inr` (required), `is_cached` (required, true if showing last-known-good rather than live) | SCR-22 |
| `savings_history_viewed` | History list opened | none beyond `timestamp` | SCR-23 |

### Relapse

| Event | Trigger | Key properties | Screen |
|---|---|---|---|
| `relapse_logged` | User completes the relapse log | `quantity` (required, supports fractional), `trigger_tag` (optional), `entry_point` (required: `intervention_hub`/`ai_coach`/`home`) | SCR-21 |
| `streak_reset` | Streak recalculates following a relapse | `previous_streak_days` (required), `new_streak_days` (required) | backend, surfaced on SCR-09/SCR-25 |

### Lifecycle & Engagement

| Event | Trigger | Key properties | Screen |
|---|---|---|---|
| `signup_completed` | OTP verified for a new user | `timestamp` | SCR-04 |
| `login_completed` | OTP verified for a returning user | `timestamp` | SCR-04 |
| `onboarding_step_completed` | Each onboarding screen's primary action fires | `step` (required: `smoking_profile`/`motivation`/`savings_destination`/`notifications`) | SCR-05–08 |
| `onboarding_step_skipped` | A skippable step is skipped | `step` (required) | SCR-06, SCR-07 |
| `onboarding_completed` | Notification priming screen resolves (grant or deny) | `notifications_granted` (required, boolean) | SCR-08 |
| `home_viewed` | Home renders | `streak_days` (required), `wallet_balance_inr` (required) | SCR-09 |
| `app_opened` | Cold or resumed app open | `session_id` (required) | SCR-01 |
| `notification_received` | Push delivered | `notification_type` (required) | system |
| `notification_tapped` | Push opened | `notification_type` (required) | system → SCR-27 |

---

## U. Product KPIs

- **Save-through rate**: of Smoking Room sessions opened (`smoking_room_opened`), the % that reach `payment_success`. Directly measures whether the flow is fast/trustworthy enough to beat the competing action (walking to a shop) — the single most important funnel in the product.
- **Craving resolution mix**: distribution of `intervention_path_selected` across breathing / AI coach / Smoking Room / relapse log, and the resolution rate (`craving_resolved` vs `relapse_logged`) per path — tells the team which interventions are actually working versus which are just being tried.
- **Median time-to-payment**: elapsed time from `smoking_room_opened` to `payment_success`, against the design target in [user-flows.md](./user-flows.md) §3.1 (under 15 seconds in-app for a returning user).
- **Payment failure/pending rate**: % of `savings_intent_created` that resolve to `payment_failed` or `payment_pending` rather than `payment_success` — a trust and infrastructure health signal, watched jointly with the PA.
- **Relapse-after-open rate**: % of `craving_started` sessions that end in `relapse_logged` — the product's honest "loss rate" against craving, tracked without judgment internally the same way the product treats it externally.
- **Average savings per active user per week** (₹) — the tangible, motivating number the whole product is built around; also the plainest signal of real-world behavior change (fewer cigarettes bought).
- **Wallet trust incidents**: count of `wallet_viewed` events with `is_cached: true` persisting beyond the documented staleness window, and count of reconciliation-triggered balance corrections (§L.12) — both are health metrics for the non-custodial ledger model, not growth metrics, but must be watched closely given how trust-critical this surface is (PRD §L.7).
- **Payout failure rate**: % of `payment_success` events whose linked `savings_intent_id` later resolves to `payout_failed` rather than `payout_succeeded` — this is the health metric unique to the two-leg collect-then-payout model (PRD §L.5a) and is watched separately from the collection-leg's payment failure/pending rate above, since a payout failure happens *after* the user has already seen a success screen and triggers an automatic refund-and-reverse the user did not initiate. Sustained non-zero rates point at Savings Destination verification quality or payout-provider reliability, not at the collection leg.

## V. Activation Metric

**A user is activated when they complete their first successful save**: `payment_success` (equivalently, the first `savings_recorded`) within their first session or shortly after onboarding.

Rationale: signup or profile completion alone doesn't validate anything about the product thesis (§D) — the thesis is specifically that a real-money save can substitute for a real cigarette purchase in the moment of craving. Activation is defined at the point where that substitution has actually happened once, with real money, not merely configured.

Secondary/diagnostic activation checkpoints (not the activation metric itself, but useful for funnel diagnosis):
- Reached `onboarding_completed`.
- Reached `smoking_room_opened` at least once.
- Reached `savings_intent_created` at least once (shows intent even if payment didn't complete — useful for distinguishing "didn't try" from "tried and the payment step failed them").

## VI. Retention Metrics

- **D1/D7/D30 retention**, standard app-open definition (`app_opened`), as a baseline engagement signal.
- **Save-adjusted retention**: D7/D30 retention specifically among users who reached activation (first `payment_success`) vs. those who didn't — tests whether the core loop, once experienced, is what actually keeps people coming back (the expected product story), versus generic app-open habits.
- **Weekly saving frequency**: distribution of `payment_success` count per active user per week — distinguishes occasional users from users for whom this has become their default craving response.
- **Streak survival**: distribution of `streak_reset` intervals (days between resets) over time per user — is the smoke-free streak getting longer across a user's lifetime in the app, which is the clinically-relevant (if softly stated, per §IX.1) outcome underneath the money mechanic.
- **Goal completion rate**: % of created `savings_goal` records that reach 100% (if goals are in the build per [mvp-scope.md](./mvp-scope.md) note) — a concrete, bounded motivator's effectiveness.

## VII. North Star Metric

**Total verified rupees saved via completed Digital Smoking Room transactions, per active user, cumulative.**

This is chosen over a pure engagement metric (DAU, sessions) or a pure health metric (streak length) because it is the one number that simultaneously represents: (a) the core loop actually firing (a real `payment_success`, not a vanity action), (b) real behavior change (money only accumulates here if a cigarette purchase was actually skipped in that moment), and (c) the product's own value proposition stated back to the user (§E) — it is the same number the user sees on their Quit Wallet, so the company's success metric and the user's own motivator are, by design, the same number. Optimizing for it directly optimizes for the save-through rate (§U) and for genuine craving substitution, not for engagement-for-its-own-sake.
