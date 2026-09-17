# Payment Flow — SCR-17–20 (+ the payout-leg failure path)

UX specification only — no payment infrastructure implementation, gateway selection, or nodal-account mechanics are decided here. The behavior below is written to match `docs/product/PRD.md` §L, now the canonical, governing description of the money flow.

---

## Resolution note (history, not a live conflict)

An earlier version of this document (and `quit-wallet.md`, and `design-system.md`) was built against `docs/architecture/payment-architecture.md`'s platform-revenue model and flagged an unresolved conflict with the PRD's route-through model. **That conflict is resolved: the PRD is canonical.** The PRD's model has also been made concrete enough to actually build — it's no longer a vague "money routes to the user's own account somehow," it's a specific **two-leg collect-then-payout mechanism** (PRD §L.1):

1. **Collection leg** — the user authorizes a real UPI payment via their own UPI app, processed by a licensed Payment Aggregator (PA) into the platform's standard merchant collection account. Ordinary merchant collection, no special license needed.
2. **Payout leg** — on confirmed collection, the platform immediately triggers an outbound transfer of the *same amount* via the PA's Payout capability to the user's own **Savings Destination** (a bank account/VPA registered and verified in Savings Destination Setup). This is what makes the "we never hold your money" claim literally true rather than aspirational — the platform moves money it just collected straight back out, automatically, as part of one user-initiated action.

There is **no voucher/donation redemption system** in this model — that entire mechanism (previously specified in this document and in `quit-wallet.md`) is retired along with the model it belonged to. Nothing in this document below references it; if you're looking for it, it's gone, not moved.

---

## SCR-17 — UPI Payment Handoff

**Purpose:** hand off to the user's chosen UPI app to authorize the collection-leg payment. Per PRD: "the least 'designed' screen in the flow... it should look and feel exactly like every other UPI payment the user has ever made."

- **Hierarchy:**
  1. Locked amount display, top, Display M, non-editable (carried from Amount Confirmation).
  2. A single, brief line clarifying the two-leg mechanic without over-explaining it: *"This moves straight through to your [Savings Destination label] account."* — enough to set the right mental model (this collection is a pass-through, not the final destination) without turning a deliberately minimal screen into an explainer.
  3. Standard PA-driven UPI app chooser / deep link — not custom-built. Most of this screen's actual surface is the PA SDK's own UI.
- **Components:** amount display, one clarifying line, PA checkout hand-off.
- **CTA:** none custom — the user acts inside the UPI app the PA hands off to.
- **Secondary actions:** *"Cancel"* (ghost, top-left) → confirm-dismiss per the Abandonment rule in `digital-smoking-room.md`.
- **Navigation:** forward (after the UPI app returns control) → Payment Processing. Back → Amount Confirmation (a fresh idempotency key is generated for any retry, per PRD §L.3).
- **States:** default; launching (brief loading spinner, <1s expected); no-UPI-app-installed (PA's own fallback UI handles this — manual UPI ID entry, etc. — not duplicated here).
- **Error handling:** delegated to the PA SDK's own error surfaces where possible, to avoid diverging from a pattern users already trust.
- **Accessibility:** the clarifying destination line is read before the amount by TalkBack.
- **Microcopy:** no e-commerce language ("Place order," "Complete purchase") — this is a real payment, kept as neutral as a real payment screen can be.

---

## SCR-18 — Payment Processing

**Purpose:** bridge the gap between "user authorized in the UPI app" and "the PA has confirmed the collection leg." Per PRD §H, **this is the one screen in the entire app with no exit at all** — not even a top-left close — to prevent a duplicate-submission race while a PA request is in flight (`user-flows.md` §4.2 explains why this is a deliberate constraint, not an oversight).

- **Hierarchy:** single-focus, full-screen, `redirect.100` background.
  1. Payment state component, **pending** state: animated indeterminate spinner around a payment/bank icon.
  2. Status line (Body L): *"Confirming your payment…"*
  3. Reassurance sub-line (Body M, `ink.600`): *"This can take a few seconds. Don't close the app."*
- **Components:** payment state component (pending), status text. No secondary controls of any kind — deliberately, unlike a typical "pending" screen elsewhere in this app, there is no manual "Check status" escape hatch here either, since the screen itself has no exit path regardless.
- **CTA:** none. This screen has zero interactive elements besides the OS back button, which is suppressed per PRD §H.
- **Navigation:** none available while pending — auto-routes to Payment Success or Payment Failure once the backend resolves the collection leg (webhook or the bounded 30–60s status-polling fallback, PRD §O).
- **States:** polling only, until it resolves.
- **Error handling:** if polling exceeds the bounded timeout (30–60s target per PRD §O) with no resolution, auto-routes to Payment Failure's **pending/unconfirmed** sub-state — never left hanging indefinitely, never falsely routed to Success.
- **Accessibility:** spinner is decorative; status line is a live region.
- **Microcopy:** calm, no visible countdown clock.

---

## SCR-19 — Payment Success

**Purpose: this is where beat 3 lands — "I actually saved it."** Reachable **only** after the backend has verified the collection leg and written the immutable Ledger Entry (PRD §L.4–L.5) — never optimistically rendered from the client alone. The client does **not** wait for full payout settlement to show this screen (PRD §L.4: "the user's save is complete and shown as such once collection is confirmed and the payout has been accepted for processing") — so this screen needs to be honest about a payout that is very likely still finishing in the background, without making that feel like an asterisk on the win.

- **Hierarchy:**
  1. Payment state component, **success** state: checkmark-in-circle, `reward.600`, restrained celebratory motion (~500ms burst — this happens potentially several times a week, it must stay satisfying on repeat, not exhausting).
  2. Headline (H1): *"₹[amount] just went to your [Savings Destination label] account."* — plainly true now, no hedging language needed.
  3. **Count-up reinforcement block** — the Quit Wallet's running total visibly increments from its prior value to the new value in front of the user (600–900ms tabular-nums count-up).
  4. Streak/context line (Body L): *"That's [N] cigarettes avoided this month."* or, first-time: *"Your first save. This is how it starts."*
  5. **Quiet payout-status line** (small, `ink.600`, below the main content, not competing with the celebration): *"Sent to your account"* once payout is confirmed complete, or *"On its way to your account"* if the payout leg is still `initiated` at the moment this screen renders (the common case for the first second or two after collection confirms — payouts are typically fast but not always instantaneous). This line updates live if the user stays on the screen long enough to see it flip from "on its way" to "sent," but nothing about the primary celebration depends on which state it's in — the ledger entry and balance are already real and final regardless of payout timing.
  6. Optional reflection prompt (low emphasis, skippable): *"Want to note what triggered this craving?"*
- **Components:** payment state component (success), headline, animated balance counter, streak context line, quiet payout-status line, optional reflection input, primary CTA.
- **CTA:** *"Done"* → Home.
- **Secondary actions:** optional reflection field.
- **Navigation:** forward only → Home. No back button.
- **States:** first-ever success; repeat success; payout-still-initiated (quiet sub-state of the above, not a blocking or alarming one — see §5 below for what happens if this state resolves to *failed* instead of *completed*, which is a different screen's job entirely, not this one's).
- **Error handling:** n/a — this screen only renders once collection is confirmed and the ledger write has committed, regardless of payout status.
- **Accessibility:** headline announced first, then the count-up, then the payout-status line as a distinct, calmly-toned statement (not urgent, not alarm-coded).
- **Microcopy:** present tense, factual, ownership-affirming — "your account," "your money" are now accurate and used plainly (per `design-system.md` §1 Principle 6), not hedged into "tracked savings" language from the retired model.

---

## SCR-20 — Payment Failure / Retry

**Purpose:** a Payment Aggregator/bank-side failure of the **collection leg** must never be experienced as a personal failure to quit. Per PRD §I, three distinct sub-states with distinct copy — not one generic failure screen.

- **Hierarchy:**
  1. Payment state component, **failure** state: a simple, calm "X" or alert glyph in `alert.600` — contained to the icon/card, not a full-bleed alarm-red background.
  2. Headline (H1): *"Payment didn't go through."* (never "You failed")
  3. Reason line (Body M), matching the three PRD-defined cases:
     - **Failed** — *"Something went wrong on the payment side."*
     - **Cancelled** — *"You cancelled the payment."*
     - **Pending / unconfirmed** — *"We're still checking with your bank."*
- **CTA — Failed/Cancelled:** *"Try again"* → back to UPI Payment Handoff with a **fresh idempotency key** (PRD §L.3) — same locked amount and destination, no need to re-select brand/quantity.
- **CTA — Pending/unconfirmed:** **no retry button.** Per PRD §L.11/§H, retrying an unconfirmed payment risks a duplicate charge, so this state shows *"We'll update you within a few minutes"* and a single *"Back to Home"* action — resolution arrives asynchronously via Notifications once the reconciliation/webhook confirms (PRD Functional Requirement 13).
- **Secondary action (Failed/Cancelled only):** *"Exit without saving"* — routes to Home, no Ledger Entry created, no false success state (PRD §I SCR-20).
- **Navigation:** "Try again" → UPI Payment Handoff. "Exit without saving" / "Back to Home" → Home.
- **States:** Failed (retry available); Cancelled (retry available); Pending/unconfirmed (no retry, async resolution only) — three distinct states, matching PRD's explicit branch.
- **Error handling:** this screen *is* the error-handling surface for the collection leg.
- **Accessibility:** headline and reason line announced together; in the pending case, the absence of a retry button reads as "waiting," not "broken."
- **Microcopy:** avoid "failed," "error," "declined" as headline vocabulary regardless of case — headline stays *"Payment didn't go through."*

---

## Payment State Component — Shared Spec

Referenced by SCR-18/19/20 above; built once, swapped by state so the screen layout never jumps between pending/success/failure.

| Property | Pending | Success | Failure |
|---|---|---|---|
| Icon | Indeterminate spinner | Checkmark-in-circle | X / alert-in-circle |
| Color | `redirect.600` | `reward.600` | `alert.600` |
| Motion | Continuous rotation | One-shot burst, 500ms | One-shot settle, 200ms, no bounce |
| Container | `redirect.100` tint | `reward.100` tint | `surface.100` neutral tint |
| Reduce-motion fallback | Static spinner icon | Static checkmark, no burst | Static icon, no settle animation |

---

## Payout-leg failure — the new, async failure mode (PRD §L.5a)

**This does not exist in a single-leg payment design and has no equivalent screen in the SCR-17–20 sequence above** — it's a structurally different event that happens *after* SCR-19 has already rendered and the user has already left the Digital Smoking Room, potentially minutes or hours later. PRD's own Acceptance Criteria treats this as a first-class scenario, not an edge case to hand-wave: *"Given a collection succeeds but the subsequent payout... fails after exhausting retries, then the collected amount is automatically refunded... the Ledger Entry is reversed, and the user is notified with a clear next step."*

- **Trigger:** the payout leg (§L.5a) exhausts its bounded automatic retries — invalid/deactivated Savings Destination, payout provider outage, beneficiary verification lapsed.
- **System behavior (not a screen, context for the UX that follows):** the platform auto-refunds the collected amount to the user's original payment source, reverses the Ledger Entry, and fires a notification. The platform is never left holding confirmed-collected, unforwarded funds (PRD §L.0's core guarantee, kept true even in this failure branch).
- **User-facing surface 1 — Notification (SCR-27):** *"Your last save didn't complete"* — factual, not alarming. Tapping it deep-links directly into the relevant Savings History transaction detail (SCR-23), not to a generic notifications list.
- **User-facing surface 2 — Savings History transaction detail (SCR-23):** the original entry now shows a **reversal** — see `quit-wallet.md` §Savings History for the exact row treatment — with plain-language context: *"This save couldn't reach your account and was refunded to your original payment method. Your Savings Destination may need attention."* with a direct CTA into **Payment & Savings Destination Settings (SCR-30)**.
- **User-facing surface 3 — Quit Wallet balance:** decreases by the reversed amount, via the same visible, dated reversing Ledger Entry mechanism used for any other correction (PRD §L.6) — never a silent balance edit.
- **What does NOT happen:** SCR-19 is never retroactively "un-shown" or edited — the user genuinely saw a real, accurate success screen for a real, accurate ledger write at the time it happened. This later reversal is a new, separate, honestly-labeled event, not a correction implying the original screen lied. Streak is unaffected — a payout failure is a payment-infrastructure problem, not a smoking event, and must never be conflated with a relapse in any UI.
- **Design todo flagged, not resolved here:** the exact notification copy, timing, and whether a badge/indicator should appear elsewhere (e.g., a small marker on the Wallet tab icon) is a reasonable follow-up refinement once real payout failure rates are known post-launch (PRD §L.5a notes this explicitly) — this section specifies the required user-facing surfaces, not a final pixel-level treatment of a hopefully-rare state.
