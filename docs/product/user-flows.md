# User Flows — Digital Smoking Room

Companion to [PRD.md](./PRD.md). Screen IDs (SCR-xx) match the PRD's screen-by-screen specification.

---

## 1. Full journey map

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FIRST RUN                                                               │
│  Splash → Onboarding Carousel → Phone Entry → OTP → (authenticated)     │
│  → Smoking Profile Setup → Motivation/Goal → Savings Destination        │
│    (skippable) → Notification Priming → Home                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  EVERY SESSION AFTER                                                    │
│  Splash → Home                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                     craving hits while using the app
                                    │
                                    ▼
                    Home: "I WANT TO SMOKE" (primary) OR
                    Home: "Open Smoking Room" (secondary, skips check-in)
```

Two entry points into the money-saving action exist on purpose:

- **"I WANT TO SMOKE" (primary CTA)** — for a user who wants support deciding what to do. Routes through Craving Check-In → Intervention Hub, where the Smoking Room is one of three equal options (alongside breathing and AI coach).
- **"Open Smoking Room" (secondary action)** — for a user who already knows they want to log a save right now and doesn't want an extra screen in the way. This exists because Principle 1 ("speed beats willpower") and Principle 8 ("the craving path is a fork, not a funnel") both argue against forcing every user through a check-in before they can save money — some users will use this app the way they'd use a vending machine, and that's a valid, desired usage pattern, not a shortcut to prevent.

---

## 2. Craving Check-In → Intervention Hub fork

```
Home "I WANT TO SMOKE"
        │
        ▼
Craving Check-In (SCR-10)
  - intensity (optional)
  - trigger tag (optional)
  - both skippable — "Continue" always enabled
        │
        ▼
Craving Intervention Hub (SCR-11)
        │
   ┌────┼────────────────┬───────────────────┐
   │    │                │                    │
   ▼    ▼                ▼                    ▼
Breathing   AI Coach       Smoking Room     "I already smoked"
(SCR-12)    (SCR-13)       (SCR-14+)        (SCR-21 Relapse Log)
   │            │
   ▼            ▼
"I feel      user can pivot to Smoking Room or
 better"     Relapse Log at any point from chat
   │         (always-visible shortcuts)
   ▼
craving_resolved
logged → Home
```

Design rule: every leaf in this tree is reachable from every other leaf without dead-ending. A user in the AI Coach chat who decides they're going to smoke anyway can log it in two taps; a user in the breathing exercise who's still craving after 60 seconds is offered the coach or the Room next, not forced to repeat breathing.

---

## 3. Digital Smoking Room — detailed UX (SCR-14 → SCR-20)

### 3.1 Design targets

- **Tap budget**: from "Open Smoking Room" to payment handoff (SCR-17) in **4 taps or fewer** for a returning user with one smoking profile: (1) brand — auto-selected if only one profile exists, so this can be a 0-tap pass-through, (2) quantity chip, (3) confirm amount/action bar, (4) authorize in UPI app. First-time or multi-profile users take one or two extra taps for brand selection.
- **Time budget**: SCR-14 through SCR-16 should render and respond within 300ms per step on a mid/low-tier Android device (§O in PRD). The full in-app portion of the flow (excluding time spent inside the external UPI app) should complete in under 15 seconds for a returning user.
- **Why this matters**: per Product Thesis (§D), this flow is in direct competition with "walk to the shop and buy a cigarette." Every screen, dialog, or required field beyond what's listed above is a defection risk and must be justified against that competition, not against generic UX best practice.

### 3.2 Step-by-step

**Step 1 — Cigarette Selection / Brand Picker (SCR-14)**
- If the user has exactly one Smoking Profile, this step can be configured to auto-advance with that profile pre-selected (still visible for a beat so the user can correct it, but not requiring a tap to proceed) — a build decision to validate during implementation, default to visible-but-fast rather than fully invisible so the user always sees what they're "standing in for."
- If multiple profiles exist: **usual (primary) brand** first as the largest target, then up to 3 **recently/previously used** brands below it (ordered by `last_used_at`), no scrolling required for that common case.
- **Search** sits above the list, always visible, not a secondary affordance — filters the user's own profiles first, then the admin-managed brand reference list (names only, no pricing). This is for the non-brand-loyal, multi-stick-source user (PRD §B), not an edge case.
- **"I can't find my brand"** is an always-visible link, never buried in a menu — opens custom brand entry (free-text name → price configuration: pack price + cigarettes-per-pack, or a single-stick-mode toggle for direct per-cigarette price) inline, in the Room, without a detour to Settings. Completing it creates a new Smoking Profile and proceeds straight to Step 2 with it selected. This sub-flow is the one place in the Digital Smoking Room where the 4-tap budget (§3.1) doesn't apply — a first-time or new-brand save is allowed to take longer, since accuracy of the price the user is about to pay matters more than speed in this specific case; the fast path is for *returning* saves with an already-configured profile.
- Every price shown anywhere in this screen is the user's own self-reported price — never sourced from an admin catalog (Immutable Rule 3). A user's custom brand entry is private to their own profile and is never added to the shared reference list other users search against.

**Step 2 — Quantity Selection (SCR-15)**
- Defaults to 1 stick. This default is deliberate: the brief is explicit that individual-cigarette quantity is a first-class case, not an edge case, and most craving moments are for one cigarette, not a pack.
- Quick-select chips: 1, 2, 5, and the user's pack size (if set in their profile) — covers "one stick right now" through "I was about to buy a full pack" without typing.
- Live price preview updates on every tap, no separate "calculate" step.

**Step 3 — Amount Confirmation (SCR-16)**
- Single screen showing: amount, one-line summary of what it represents, and the savings destination.
- The amount/action bar (full-width, per the brief: "Tap the amount/action bar") is simultaneously the summary display and the primary CTA — reduces the screen to one decision.
- Hard requirement carried over from PRD §L: if no savings destination is set, the action bar is replaced by a destination-setup prompt inline on this same screen (not a redirect to a separate settings flow that loses the user's place) — the quantity/brand selection state is preserved so the user returns straight to a ready-to-pay action bar once the destination is set.

**Step 4 — UPI Payment Handoff (SCR-17)**
- Standard UPI app chooser / deep link — not custom-built. This is intentionally the least "designed" screen in the flow; it should look and feel exactly like every other UPI payment the user has ever made, because novelty here adds hesitation at exactly the wrong moment.

**Step 5 — Payment Processing (SCR-18)**
- No cancel action once submitted (PRD §H navigation rule, tied to §L duplicate-payment prevention). Bounded wait with a visible progress indicator; internal timeout (target 30–60s) after which the flow routes to SCR-20 in the "pending/unconfirmed" state rather than hanging indefinitely.

**Step 6a — Payment Success (SCR-19)**
- Renders only after backend-confirmed ledger write (PRD §L.4–L.5). Shows the concrete payoff: amount saved, updated wallet balance, updated cigarettes-avoided count, streak. This is the moment the product's core loop pays off emotionally — worth investing polish here, in contrast to the deliberately plain SCR-17.

**Step 6b — Payment Failure / Retry (SCR-20)**
- Three distinct sub-states with distinct copy (failed / cancelled / pending-unconfirmed) — see PRD §I SCR-20. Only failed/cancelled offer an immediate retry; pending-unconfirmed defers to async resolution via notification to avoid double-charging risk.

### 3.3 What is explicitly out of this flow

- No browsing of tobacco products, no images styled as a shelf/catalog, no "recommended" or "popular" product surfacing — the brand list is exactly the user's own saved profile(s) plus a manual fallback, nothing algorithmic or catalog-like (Principle 4).
- No saved/stored payment authorization for one-tap future payments in MVP — every payment is explicitly confirmed per PRD Principle 7 and NFR security posture.

---

## 4. Craving → Payment → Savings — end-to-end sequence

This traces one successful save across client, payment provider (PA), and backend ledger, plus the failure branches, per PRD §L.

```
CLIENT (App)                    BACKEND                         PAYMENT AGGREGATOR (PA)
─────────────                   ───────                         ───────────────────────
User confirms amount
on SCR-16 ("Save ₹24")
     │
     ▼
POST create Savings Intent  ──▶  Create Savings Intent
                                  (status: created)
                                  Generate savings_intent_id
                                  as idempotency key
                                       │
                                       ▼
                                  Create Payment Transaction ──▶ Initiate UPI intent/collect
                                  (status: initiated,             with idempotency key
                                   linked 1:1 to intent)                │
                                       │◀──────────────────────────────┘
                                       │  PA transaction reference
     │◀──────────────────────────────┘
     ▼
SCR-17: hand off to
UPI app (external)
     │
     ▼
User authorizes in
UPI app
     │
     ▼
SCR-18: Processing
(waiting, no cancel)                  │
                                       │◀─────────────────────── PA sends webhook:
                                       ▼                          payment SUCCESS
                                  Verify webhook signature
                                  Check: does a Ledger Entry
                                  already exist for this
                                  savings_intent_id?
                                       │
                              ┌────────┴────────┐
                         NO (first time)    YES (duplicate webhook)
                              │                  │
                              ▼                  ▼
                   Write Ledger Entry      No-op (idempotent) —
                   (atomic with marking    do not write a second
                   Payment Transaction     entry
                   confirmed)
                              │
                              ▼
                   Recompute Quit Wallet
                   balance (derived)
                              │
     │◀─────────────────────┘
     ▼
SCR-19: Success —
amount saved, new
balance, streak
```

### 4.1 Failure branches

| Branch | Trigger | Client behavior | Ledger effect |
|---|---|---|---|
| User cancels in UPI app | User backs out of the UPI app before authorizing | PA/webhook reports cancelled or client detects no-return-with-success within timeout → SCR-20 "cancelled" | None |
| Payment fails at bank/PA | Insufficient funds, bank decline, etc. | PA webhook reports failure → SCR-20 "failed" | None |
| Webhook delayed/lost | Network/provider issue | Backend status-polling fallback queries PA directly after timeout window; if still unresolved, SCR-20 "pending" | None yet — resolved async once PA status is available, via notification (SCR-27) |
| Duplicate webhook delivery | PA retries webhook delivery (normal PA behavior) | Backend no-ops on the second delivery (idempotent on `savings_intent_id`) | Exactly one entry, not two |
| Duplicate charge at PA/bank layer (rare) | External failure outside the idempotency key's control | Detected by scheduled reconciliation (PRD §L.12), not by the client in real time | Reversing entry + refund initiated (PRD §L.9) after operational review |

### 4.2 Why Payment Processing (SCR-18) blocks cancellation

Allowing a cancel/back action while a PA request is in flight risks the user re-triggering the flow from SCR-16 while the original request is still resolving, which is exactly the duplicate-payment scenario the idempotency key is designed to prevent at the request layer — but a UI-level second submission is cheaper to prevent by simply not offering the control than to rely on backend dedup alone. This is a deliberate constraint, not an oversight (see PRD §H).

---

## 5. Relapse logging flow

```
Any screen with an "I already smoked" shortcut
(Intervention Hub, AI Coach chat, Home)
        │
        ▼
Relapse Log (SCR-21)
  - quantity smoked (stepper, supports partial sticks)
  - optional trigger tag
  - neutral copy throughout
        │
        ▼
"Log and continue"
        │
        ▼
Streak recalculates per documented rule
Cigarettes-avoided and Progress screens
update consistently
        │
        ▼
Home
```

No payment, no wallet interaction, no negative-coded UI anywhere in this path (PRD Principle 2, §IX Safety Requirement 4).
