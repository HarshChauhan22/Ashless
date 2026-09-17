# Quit Wallet, Savings Destination & Savings Goals — SCR-07, SCR-22–24, SCR-30

Covers the "proof over time" side of the product — where beat 3's momentary "I actually saved it" becomes a durable, browsable record — plus the two Savings Destination screens the two-leg payment model depends on.

---

## Resolution note (history, not a live conflict)

An earlier version of this document specified a voucher/donation redemption system, built against `payment-architecture.md`'s now-retired platform-revenue model. **That model is retired; the PRD's two-leg collect-then-payout mechanism is canonical** (see `payment-flow.md`'s own resolution note for the full history). Under this model, every save already lands automatically in the user's own Savings Destination account at the moment it happens — there is nothing left to redeem, because nothing was ever held back. **The entire redemption flow previously specified here is deleted, not adapted.** Quit Wallet goes back to being a straightforward, honest mirror of money the user already has.

---

## SCR-07 — Savings Destination Setup (onboarding)

**Purpose:** capture where the user's redirected money should actually land. Per PRD §L.1, this isn't a cosmetic label — it's the **payout beneficiary**, which the Payment Aggregator's payout API requires to be registered and verified before it can receive a transfer. This is the most consequential onboarding screen in the app: get it wrong and the whole "your money, your account" promise doesn't work technically, not just rhetorically.

- **Hierarchy:**
  1. Trust-framing copy, prominent, above any input: *"We never hold your money. Every save goes straight to your own account."*
  2. Destination input: a UPI-linked bank account/VPA — same account the user pays from, or a different one, their choice. Standard UPI linking, delegated to the PA SDK (not custom-built).
  3. Optional: a savings-goal label attached to this destination (e.g., "New phone fund") — can also be added later from Wallet, not required here.
  4. Skip option, clearly visible, not buried: *"Set this up when I make my first save."*
- **Components:** trust-copy block, destination input (delegated to PA SDK), optional goal-label field, "Continue" and "Skip for now" actions.
- **CTA:** *"Continue"* (destination set) or *"Skip for now"* (deferred to first payment attempt).
- **Secondary actions:** none beyond skip.
- **Navigation:** forward → Notification Permission Priming (SCR-08). Back → Quit Motivation & Goal Selection (SCR-06).
- **States:** default (empty form); loading (during the PA's VPA verification call — typically a penny-drop or UPI validation, per PRD §L.1); error (invalid VPA / verification failure → inline message, **does not block skipping** — a failed verification attempt should never trap the user in onboarding); success (destination registered and verified).
- **Why skippable:** forcing a bank-linking step before the user has felt any craving is a known onboarding drop-off risk (PRD Principle 1) — deferring it to the first real Amount Confirmation (SCR-16's hard gate, see `digital-smoking-room.md`) keeps onboarding fast while still guaranteeing a destination exists before real money ever moves.
- **Error handling:** VPA verification failure shows a specific, actionable inline message (e.g., "We couldn't verify that account — check the details or try a different one"), with Skip always available as an escape hatch regardless of the error.
- **Accessibility:** trust-framing copy is read before the input fields, since it's the context that makes the request for bank details feel reasonable rather than alarming.
- **Microcopy:** the trust line here is load-bearing — it's the first time the app asks for anything resembling banking information, and per PRD's own risk table, "users mistake Quit Wallet for a custodied balance" is a named risk this exact copy is the mitigation for.

---

## SCR-30 — Payment & Savings Destination Settings

**Purpose:** the Settings-tab counterpart to SCR-07 — same fields, editable any time, plus visibility into the currently linked destination. Per PRD, this is explicitly the **highest-caution screen in Settings**, since it determines where future real money goes.

- **Hierarchy:**
  1. Currently linked destination(s), shown plainly (masked account/VPA, verification status).
  2. "Change destination" / "Remove" actions.
  3. Re-link flow, same PA SDK verification as SCR-07.
- **Components:** destination display card (masked account number/VPA, status badge: Verified / Needs attention), change/remove actions, re-link form (same as SCR-07's).
- **CTA:** "Change destination" → re-link flow. "Remove" → confirmation (see error handling below).
- **Secondary actions:** none.
- **Navigation:** back → Profile & Settings (SCR-28). Also reachable directly from: a payout-failure notification (see `payment-flow.md` §Payout-leg failure), Amount Confirmation's inline destination prompt (`digital-smoking-room.md` SCR-16), and Quit Wallet's "Set a savings destination" banner if unset.
- **States:** no destination set (empty, prompts setup — same trust copy as SCR-07); verified destination active; **needs attention** (a destination that failed payout verification or was flagged by a reconciliation mismatch — shown with a calm, non-alarming but clearly actionable status badge, since this state directly blocks future saves from completing).
- **Error handling:** removal must clearly distinguish "removed successfully" from "removal failed" (PRD: "this affects where future real money goes") — never leave the user unsure whether a change actually took effect. Removing the only destination while it's the sole one on file shows an inline warning (not a hard block) that the next save will need a destination before it can complete.
- **Accessibility:** verification status is conveyed by icon + text + color together, never color alone.
- **Microcopy:** matches SCR-07's trust framing — this screen should never feel like "banking settings" in a generic fintech sense; it stays anchored to "where your savings go," consistent with the rest of the product's voice.

---

## SCR-22 — Quit Wallet (home)

**Purpose:** the wallet's own front door — reachable any time via bottom nav, not just as a post-payment redirect target.

- **Hierarchy:**
  1. Top: **Total saved** — Display L, tabular nums, `reward.600` accent, "all-time" caption. Per PRD §L.7, always computed from the ledger, never cached indefinitely without a documented staleness rule.
  2. **"How this works" link** (always present, directly under the headline number) → short explainer sheet: *"Every save moves straight to your own account automatically — this is a record of that, not money we're holding."* This directly mitigates the named risk (PRD §VIII: "users mistake Quit Wallet for a custodied balance and expect a withdraw button") — but note the resolution, not the caution, is what's new here: there genuinely is no withdraw button, and now it's because the money already moved automatically, not because it's being withheld.
  3. Secondary stat row: "This month" (₹, delta vs last month) · "Cigarettes avoided" (count, links to SCR-26).
  4. Active Savings Goal summary card (if any set) — progress bar, tap-through to Savings Goals (SCR-24).
  5. **"Set a savings destination" banner** — shown only if the user skipped SCR-07 and hasn't set one since; direct CTA into a lightweight destination-setup flow (same as SCR-07/SCR-30).
  6. "Recent activity" — last 5 entries, condensed Transaction rows (see SCR-23 row treatment below), "View all" → Savings History.
- **Components:** Stat cards, Goal card, "How this works" link, destination-missing banner (conditional), Transaction row list (condensed).
- **CTA:** none singular — dashboard screen. "View all" and the Goal card tap-through are the primary interactive elements.
- **Secondary actions:** destination banner CTA (if shown).
- **Navigation:** bottom nav (Wallet tab).
- **States:** empty (no transactions yet); populated; destination-missing (banner shown); balance read failure → **last known good cached balance with a visible "updating…" indicator**, never blank or zero (PRD §L.7 names a wallet showing ₹0 on a transient error a **P0 trust-destroying bug class**).
- **Empty state:** *"Every save lands here, straight in your own account. Your first one is waiting."* with a CTA into the craving flow.
- **Accessibility:** Total saved announced as a single grouped value; delta captions use explicit sign language.
- **Microcopy:** "Total saved," "your account," "your money" — all used plainly now, no hedging (`design-system.md` §1 Principle 6).

---

## SCR-23 — Savings History

**Purpose:** the full ledger — dense, scannable, trustworthy. Now also the primary surface for payout-leg status, since a save's journey (collected → paid out) has two legs the user can verify independently.

- **Hierarchy:**
  1. Header: "Savings History" + date-range filter chip (This month / Last 3 months / All time).
  2. Chronological Transaction row list, grouped by date.
  3. Each row: icon, label, timestamp, signed amount, and a small **payout status marker** for redirected-craving entries — quiet/default in the common case (a small checkmark once payout completes, no marker at all needed in the split-second "initiated" window most users will never actually see), and a distinct **"needs attention"** marker for the rare payout-failure case.
  4. Tap-through detail sheet: date, amount, **collection reference (UTR)** and, once available, **payout reference** — both independently checkable against the user's own bank/UPI statement (PRD §L.6, §L.10) — this dual-reference detail is new relative to a single-leg design and is the concrete mechanism behind "trust the number because you can verify it yourself."
- **Row types:**
  - **Redirected save** (credit): `reward.600` amount, e.g., *"Redirected save · +₹40"*, payout marker as above.
  - **Relapse logged** (no amount, informational only): neutral `ink.600` icon, e.g., *"Logged a smoke · streak reset"* — never `alert` color.
  - **Abandoned** (neutral, collapsed under "Show minor activity" by default): *"Started a save, didn't finish."*
  - **Reversal** (new — from a payout-leg failure, `payment-flow.md` §Payout-leg failure): *"Adjustment · save refunded."* Tapping it opens the plain-language explanation and a direct CTA into SCR-30 to fix the destination — see `payment-flow.md` for the exact copy.
- **CTA:** none screen-level; row-level actions on reversal entries.
- **Secondary actions:** filter chip interaction; "Show minor activity" toggle.
- **Navigation:** entered from Quit Wallet's "View all," or directly from a payout-failure notification (deep-links to the specific reversed entry).
- **States:** default (populated); filtered; empty-for-range.
- **Error handling:** pagination failure → inline retry row at the list's end.
- **Accessibility:** each row's full sentence (including payout status where present) is the accessible label.
- **Microcopy:** relapse rows stay in the same calm register as everything else. Reversal rows are factual, not alarming — a payout hiccup is an infrastructure event, not a personal one.

---

## SCR-24 — Savings Goals

**Purpose:** turns the running total into something the user is saving *toward* — a motivational label on the underlying ledger, not a segregated pool of held money (PRD §I: "goals are a display label on the single underlying ledger, not fund segregation").

- **Hierarchy:**
  1. Active goal(s) — name, target amount, progress bar (`redirect.600` fill), "₹X of ₹Y saved," estimated completion date.
  2. "Add goal" CTA.
  3. First-time setup: simple name + target-amount + optional target-date form — no resolution-type field is needed under this model (that was a retired-model artifact; the money is already the user's own real money in their own real account, so a goal here is just a label, and reaching it means exactly what it sounds like — the user can spend that money on whatever the goal names, because it's genuinely theirs).
- **Components:** Goal card(s), "Add goal" button, goal-creation form (name, target amount, optional target date, optional icon).
- **CTA:** "Add goal" → creation form.
- **Secondary actions:** edit/delete existing goal.
- **Navigation:** from Quit Wallet's Goal card tap-through, or Wallet tab sub-nav.
- **States:** no goals set (a fully valid state — goals are optional, per `mvp-scope.md`'s note that a single goal or even zero goals is an acceptable MVP trim); one or more active goals; goal completed (celebratory, restrained, `gold.500` accent badge — no redemption action needed, since the money's already sitting in the user's own account; completing a goal is just a milestone, not a transaction).
- **Error handling:** goal-creation form validates target amount > 0; target date is optional (open-ended goals are valid).
- **Accessibility:** progress bar exposes percentage via `contentDescription`.
- **Microcopy:** goal completion copy: *"You reached your goal. That's [N] redirected cigarettes that got you here."* — always ties the number back to the behavior.
