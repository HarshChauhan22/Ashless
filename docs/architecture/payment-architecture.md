# Payment & Savings Ledger Architecture

Related: [system-architecture.md](./system-architecture.md) · [database-schema.md](./database-schema.md) · [api-spec.md](./api-spec.md) · [security.md](./security.md)

This is the most consequential document in this set. Read it before implementing anything in `payments/` or `ledger/`.

> **Revision note**: this document previously described a *platform-revenue* model (payments collected as the platform's own revenue, with `voucher`/`donation` redemption and `bank_payout` gated to Phase 2). That model is **superseded**. `docs/product/PRD.md` §L is the canonical, binding description of the money flow for this project; this document has been rewritten to match it exactly. If anything below and the PRD ever disagree again, the PRD wins — fix this document, don't reinterpret it.

---

## 1. The legal/product framing (read this first)

**Hard constraint from the brief:** the app must not send money to tobacco merchants, and the backend must not assume it can legally hold customer funds directly (that would require an RBI Prepaid Payment Instrument / e-money license, or a bank/NBFC partnership — out of scope for an MVP).

**What this rules out:** a "wallet" where the user's UPI payment lands in an account we hold on their behalf, redeemable as cash on demand, *and* a model where the platform collects the payment as its own revenue and only owes the user a voucher or donation in return. Both of those either require a license we don't have, or make the product's "you get your money" promise false.

**What the architecture actually does instead — the two-leg model (PRD §L.1):**

A UPI collect/intent payment cannot land directly in an arbitrary destination the payer names at runtime — it settles into the collecting merchant's account. So the design doesn't try to avoid collecting the money; it forwards the money out again immediately, before it is ever treated as the platform's own funds:

1. **Collection leg**: the user authorizes a real UPI payment for the save amount. It is collected via our licensed Payment Aggregator (Razorpay) into the platform's standard PA-regulated merchant collection account — an ordinary merchant collection, same as any SaaS collecting a payment for itself. No special license is needed to *collect* money this way.
2. **Payout leg**: the instant the collection is confirmed, the platform triggers an outbound transfer of the **same amount** via the PA's Payout API (RazorpayX Payouts, or Cashfree Payouts as an alternate/fallback) to the user's own **Savings Destination** — a bank account/VPA the user registered and had verified as a payout beneficiary during onboarding or in Settings. This is a standard payout/vendor-transfer capability, not a stored-value instrument. The platform never nets these funds as revenue and never reports them as such; the collection and the payout are recognized together as a pass-through, not as platform income.

Both legs happen automatically, back-to-back, inside one user-initiated action. The user sees one "Save ₹X" action and one outcome. **The payout leg is required MVP infrastructure — not a Phase 2 feature gated behind a future banking/PPI partnership.** Without it, the collection leg alone would leave the platform holding the user's money, which is exactly what this framing exists to avoid.

**What actually still requires an RBI PPI/e-money license (and is explicitly out of MVP/V1):** a *locked or custodial* savings goal — one where funds are held for a period (e.g., to pay a bonus/interest on completion) rather than paid straight out. That is the only scenario in this product that would ever need a PPI partner or bank-partnered escrow. See PRD `mvp-scope.md` §R.1.

**What every screen/receipt should say:** the "savings" figure is **your money, in your own account** — not "redirected to us," not "tracked," not "platform rewards." Terms of Service should be reviewed by a lawyer before launch, specifically to confirm the collect-then-immediately-payout pattern doesn't itself constitute a PPI/e-money activity — this document defines the technical architecture, not the legal opinion (see PRD §L.13).

This framing is what the rest of this document implements: **`PaymentProvider` collects for the platform only as a pass-through step; every successful collection has a corresponding `PayoutProvider` transfer to the user's own destination; `SavingsLedger` tracks what actually happened on both legs, and there is no redemption step because the money already moved.**

---

## 2. Provider-agnostic interfaces

Defined in `src/payments/interfaces/payment-provider.interface.ts`, `src/payments/interfaces/payout-provider.interface.ts`, and `src/ledger/interfaces/savings-ledger.interface.ts`. All business logic (controllers, other services) depends on these interfaces, never on the concrete Razorpay/Cashfree classes — injected via NestJS DI tokens so swapping/adding a provider is a new class + one DI binding change.

```typescript
// payment-provider.interface.ts — collection leg
export interface CreatePaymentInput {
  userId: string;
  amountPaise: bigint;
  currency: 'INR';
  receiptId: string;          // our payment_transactions.id, for provider-side correlation
  notes?: Record<string, string>;
}

export interface CreatePaymentResult {
  providerOrderId: string;
  checkoutConfig: Record<string, unknown>; // opaque, provider-specific, safe to hand to the client SDK
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
}

export type PaymentStatusResult =
  | { status: 'pending' }
  | { status: 'succeeded'; providerPaymentId: string; amountPaise: bigint; capturedAt: Date }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' };

export interface RefundInput {
  providerPaymentId: string;
  amountPaise: bigint;        // supports partial refunds
  reason: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'processing' | 'succeeded' | 'failed';
}

export interface WebhookVerificationResult {
  valid: boolean;
  eventType: string;
  providerEventId: string;
  payload: Record<string, unknown>;
}

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(providerOrderId: string): Promise<PaymentStatusResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentStatusResult>;
  handleWebhook(rawBody: Buffer, signatureHeader: string): WebhookVerificationResult; // throws on invalid signature
  refund(input: RefundInput): Promise<RefundResult>;
}
```

```typescript
// payout-provider.interface.ts — payout leg (§1, PRD §L.5a). New in this revision.
export interface RegisterBeneficiaryInput {
  userId: string;
  destinationType: 'vpa' | 'bank_account';
  vpa?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  accountHolderName: string;
}

export type BeneficiaryVerificationResult =
  | { status: 'verified'; providerBeneficiaryId: string; verifiedAccountHolderName: string }
  | { status: 'failed'; reason: string };

export interface CreatePayoutInput {
  userId: string;
  providerBeneficiaryId: string;
  amountPaise: bigint;
  currency: 'INR';
  idempotencyKey: string;     // = savings_intent_id, see §3.1
  notes?: Record<string, string>;
}

export type PayoutStatusResult =
  | { status: 'processing' }
  | { status: 'completed'; providerPayoutId: string; completedAt: Date }
  | { status: 'failed'; reason: string; isRetryable: boolean };

export interface PayoutProvider {
  registerBeneficiary(input: RegisterBeneficiaryInput): Promise<BeneficiaryVerificationResult>;
  createPayout(input: CreatePayoutInput): Promise<{ providerPayoutId: string }>;
  getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult>;
  handleWebhook(rawBody: Buffer, signatureHeader: string): WebhookVerificationResult;
}
```

```typescript
// savings-ledger.interface.ts — no redemption; tracks both legs
export interface RecordSavingsInput {
  userId: string;
  amountPaise: bigint;              // always positive for a credit
  sourceType: 'payment' | 'admin_adjustment';
  sourcePaymentId?: string;          // required if sourceType='payment'; enforces the 1:1 DB constraint
  idempotencyKey?: string;
  description: string;
}

export interface LedgerBalance {
  balancePaise: bigint;
  updatedAt: Date;
}

export interface LedgerTransaction {
  id: string;
  entryType: 'credit' | 'debit' | 'reversal' | 'adjustment';
  amountPaise: bigint;
  balanceAfterPaise: bigint;
  sourceType: string;
  payoutStatus: 'initiated' | 'completed' | 'failed' | null; // null for non-payment-sourced entries
  description: string;
  createdAt: Date;
}

export interface CreateGoalInput {
  userId: string;
  title: string;
  targetAmountPaise: bigint;
  targetDate?: Date;
  icon?: string;
}

export interface SavingsLedger {
  recordSavings(input: RecordSavingsInput): Promise<LedgerTransaction>;
  reverseSavings(sourcePaymentId: string, reason: string): Promise<LedgerTransaction>; // used on payout failure (§5.4a) and refunds
  getBalance(userId: string): Promise<LedgerBalance>;
  getTransactions(userId: string, cursor?: string, limit?: number): Promise<{ items: LedgerTransaction[]; nextCursor: string | null }>;
  createGoal(input: CreateGoalInput): Promise<{ id: string }>;
}
```

`RazorpayPaymentProvider implements PaymentProvider` and `RazorpayXPayoutProvider implements PayoutProvider` are the MVP implementations (same PA family, two capabilities — see PRD §L.13 on confirming the chosen PA actually offers both). `PostgresSavingsLedger implements SavingsLedger` is the only implementation of the ledger; it never imports Razorpay types, and neither `payments/` nor `payouts/` writes to `savings_transactions` directly, only calls `SavingsLedger` methods.

**Note**: `redeem()` and the `RedeemInput`/redemption types from the previous revision of this document are removed. There is no redemption step in this model — see §4.4.

---

## 3. UPI payment flow (createPayment → verifyPayment → payout)

### 3.0 The full pipeline, end to end

The Digital Smoking Room's real work is choosing *which stored price* a save is computed from, before any money moves. The pipeline is:

```
1. Brand           → client calls GET /smoking-profiles (existing profiles, ordered usual-first then
                      by last_used_at) or POST /smoking-profiles (new/custom brand, pack- or
                      single-stick-mode price — api-spec.md §3.3, database-schema.md §3.2).
                      "Selecting a previously configured brand" and "selecting another configured
                      brand" are both just picking a different smoking_profile_id from this list —
                      no separate endpoint or server-side "current selection" state exists for this.
2. Quantity        → client-only UI state (SCR-15's stepper/chips). The live price preview shown
                      here is quantity × the profile's already-fetched cost_per_stick_paise —
                      informational only, never sent to or trusted by the server.
3. Calculated amount → shown on SCR-16 from the same client-side math as step 2. This is still not
                      authoritative; it exists so the user can see, before paying, the number the
                      server is about to independently compute.
4. Payment intent   → POST /payments { smoking_profile_id, quantity, ... } (§3.1 below). The server
                      RE-LOADS the smoking_profiles row from the database at this instant — it does
                      not reuse anything the client displayed in steps 2–3 — and computes
                      amount_paise = cost_per_stick_paise × quantity itself. If the displayed
                      preview and this server-computed amount ever disagree (e.g. the user edited
                      the profile's price in another tab/device between steps 1 and 4), the
                      server's number is what gets charged and shown; there is no client override.
5. Verified payment → POST /payments/{id}/verify + the collection webhook (§3.2–§3.4). Unchanged by
                      this feature: verification never re-derives price, it only confirms the PA
                      actually captured the exact amount_paise the server already committed to in
                      step 4 (§3.3's amount tamper check).
6. Savings ledger   → ledger.recordSavings() with that same amount_paise (§3.3, §4.1). Unchanged.
```

**"Changing price/pack size"** (the fourth capability the Digital Smoking Room must support) is `PATCH /smoking-profiles/{id}` (api-spec.md §3.3) — the same endpoint SCR-29 (Settings) uses. Nothing in this architecture restricts that call to Settings only; a client may expose an inline "edit price" affordance from the Brand Picker (SCR-14) itself, calling the identical endpoint. Because step 4 always re-reads the profile fresh, an edit made seconds before tapping "Save ₹X" is picked up correctly with no additional wiring — there is nothing to invalidate or re-sync.

### 3.1 Sequence

```
Android App                Backend                          Razorpay (Collection)      RazorpayX (Payout)
    │                          │                                 │                          │
    │  POST /v1/payments       │                                 │                          │
    │  {smoking_profile_id,    │                                 │                          │
    │   quantity}               │                                 │                          │
    │  Idempotency-Key: K      │                                 │                          │
    │─────────────────────────>│                                 │                          │
    │                          │ 1. Check idempotency_keys(K)    │                          │
    │                          │    -> if completed, return cached response, STOP            │
    │                          │ 2. Load smoking_profiles row,   │                          │
    │                          │    compute amount_paise from    │                          │
    │                          │    the profile's OWN price      │                          │
    │                          │    (server-side, never client)  │                          │
    │                          │ 3. Require a verified            │                          │
    │                          │    savings_destination — 422    │                          │
    │                          │    if none, before touching PA  │                          │
    │                          │ 4. INSERT payment_transactions  │                          │
    │                          │    status='created'             │                          │
    │                          │──── createOrder(amount) ───────>│                          │
    │                          │<─── {order_id} ─────────────────│                          │
    │                          │ 5. UPDATE row: provider_order_id│                          │
    │                          │ 6. Store idempotency_keys entry │                          │
    │  {order_id, checkout_config} │                             │                          │
    │<─────────────────────────│                                 │                          │
    │                          │                                 │                          │
    │  Opens Razorpay Checkout SDK (native UPI intent picker)    │                          │
    │─────────────────────────────────────────────────────────>│                           │
    │                          │       user completes UPI auth   │                          │
    │<─────────────────────────────────────────────────────────│                            │
    │  SDK callback: {razorpay_payment_id, razorpay_order_id,   │                          │
    │                  razorpay_signature}                        │                          │
    │                          │                                 │                          │
    │ POST /v1/payments/{id}/verify                               │                          │
    │ {payment_id, order_id, signature}                           │                          │
    │─────────────────────────>│                                 │                          │
    │                          │ 1. Recompute HMAC signature      │                          │
    │                          │    server-side using OUR secret; │                          │
    │                          │    reject if mismatch (400)      │                          │
    │                          │──── fetchPayment(payment_id) ──>│                           │
    │                          │<─── {status: captured, amount} ─│                           │
    │                          │ 2. Assert amount matches our     │                          │
    │                          │    own amount_paise (tamper check)│                         │
    │                          │ 3. UPDATE payment_transactions   │                          │
    │                          │    status='succeeded' (idempotent│                          │
    │                          │    — see §3.3)                   │                          │
    │                          │ 4. ledger.recordSavings(...)     │                          │
    │                          │    (Ledger Entry written NOW —   │                          │
    │                          │    this is what SCR-19 waits on) │                          │
    │  {status: 'succeeded', balance_paise}                       │                          │
    │<─────────────────────────│                                 │                          │
    │  (client shows SCR-19 — save is done from the user's POV)  │                          │
    │                          │                                 │                          │
    │                          │ 5. createPayout(beneficiary,     │                          │
    │                          │    amount, idempotencyKey=       │                          │
    │                          │    savings_intent_id) ──────────────────────────────────────>│
    │                          │<──────────────────────────────────────── {provider_payout_id}│
    │                          │ 6. UPDATE payment_transactions   │                          │
    │                          │    payout_status='initiated'     │                          │
    │                          │                                 │                          │
    │                          │◀─────────────── webhook: payout.completed ──────────────────│
    │                          │ 7. UPDATE payout_status=         │                          │
    │                          │    'completed'                   │                          │
    │  (notification only sent if payout FAILS — success is silent, already reflected in SCR-19) │
```

Step 5 onward (the payout leg) happens **after** the client has already been told the save succeeded — see PRD §L.4: the client does not block on payout settlement. If the payout later fails, the flow reverses (§5.4a), which is the one path where a notification is sent after the fact.

### 3.2 Why both `verify` (client-triggered) AND webhooks — collection leg

The client-triggered `verify` call gives the user a fast UI response. But **the client can lie, crash before calling verify, or the network can drop the callback** — so it is never the sole source of truth. Razorpay's **webhook** (`POST /v1/webhooks/razorpay`, event `payment.captured`) is the authoritative async confirmation that runs independent of whether the client ever called `verify` at all. Both paths converge on the same idempotent state-transition function (§3.3), so whichever arrives first "wins" and the second is a safe no-op.

A scheduled reconciliation sweep (§6) also independently resolves any `payment_transactions` row still `pending`/`created` after N minutes by actively calling `getPaymentStatus`, so **even total webhook failure is recoverable** without user action. The same sweep also checks `payout_status='initiated'` rows past a threshold against RazorpayX's payout status API (§5.4a).

### 3.3 The idempotent state-transition function

Both the `verify` handler and the webhook handler call the same internal method:

```typescript
async function resolvePaymentSuccess(paymentTxnId: string, providerPaymentId: string, amountPaise: bigint, source: 'verify' | 'webhook') {
  return prisma.$transaction(async (tx) => {
    const txn = await tx.paymentTransaction.findUnique({ where: { id: paymentTxnId } });
    if (!txn) throw new NotFoundError();

    if (txn.status === 'succeeded') {
      // Already resolved (by the other path, or a retry). No-op, not an error.
      return txn;
    }
    if (['failed', 'cancelled', 'refunded'].includes(txn.status)) {
      // A terminal non-success state trying to flip to success is a red flag — do not silently accept.
      throw new PaymentStateConflictError(txn.status);
    }

    // amount tamper check: what the provider actually captured must equal what we quoted,
    // which was itself computed server-side from the user's own smoking_profiles price (§4.5 / database-schema.md §3.5)
    if (amountPaise !== txn.amountPaise) {
      throw new PaymentAmountMismatchError();
    }

    const updated = await tx.paymentTransaction.update({
      where: { id: paymentTxnId },
      data: {
        status: 'succeeded',
        providerPaymentId,
        verifiedAt: source === 'verify' ? new Date() : txn.verifiedAt,
        webhookConfirmedAt: source === 'webhook' ? new Date() : txn.webhookConfirmedAt,
      },
    });

    // recordSavings() is called with sourcePaymentId = txn.id; the DB's
    // UNIQUE(source_payment_id) constraint on savings_transactions makes a
    // second call for the same payment (e.g. webhook after verify already
    // succeeded — but we already returned early above) impossible to double-apply.
    await ledgerService.recordSavings(tx, {
      userId: txn.userId,
      amountPaise: txn.amountPaise,
      sourceType: 'payment',
      sourcePaymentId: txn.id,
      description: `Saved: ${txn.quantity}x cigarette avoided`,
    });

    // Drives SCR-14's "recently/previously used" brand ordering (database-schema.md §3.2).
    await tx.smokingProfile.update({
      where: { id: txn.smokingProfileId },
      data: { lastUsedAt: new Date() },
    });

    return updated;
  }, { isolationLevel: 'Serializable' })
    .then(async (updated) => {
      // Outside the DB transaction: kick off the payout leg (§4.1a). This is
      // queued (BullMQ), not inline, so a slow/flaky payout call never blocks
      // the response the user is waiting on for SCR-19.
      await payoutQueue.add('initiate-payout', { paymentTxnId });
      return updated;
    });
}
```

This single function is the only place `payment_transactions.status` is set to `succeeded`, called from exactly two entry points (`verify` controller, webhook handler). That's what makes "duplicate payments" and "duplicate webhooks" structurally hard to get wrong — there's one code path, guarded by DB constraints, not N ad-hoc handlers.

### 3.4 Webhook handling detail (collection leg)

```typescript
@Post('webhooks/razorpay')
async handleRazorpayWebhook(@Req() req: RawBodyRequest) {
  const signature = req.headers['x-razorpay-signature'];
  const result = razorpayProvider.handleWebhook(req.rawBody, signature); // throws on bad signature

  // Insert-or-ignore dedupe FIRST, before any business logic:
  const inserted = await prisma.webhookEvent.createMany({
    data: [{ provider: 'razorpay', providerEventId: result.providerEventId, eventType: result.eventType,
             signatureValid: true, rawPayload: result.payload, processingStatus: 'received' }],
    skipDuplicates: true, // relies on the UNIQUE(provider, provider_event_id) constraint
  });
  if (inserted.count === 0) {
    return { status: 'ok' }; // already processed this exact event — duplicate delivery, safe no-op
  }

  // Return 200 fast; do the actual state resolution in a queued job so a slow
  // downstream (notifications, analytics) can never cause Razorpay to see a
  // timeout and retry-storm us.
  await webhookQueue.add('process-razorpay-event', { webhookEventId: ... });
  return { status: 'ok' };
}
```

A second, structurally identical handler exists for `POST /webhooks/razorpayx-payouts` (event `payout.processed` / `payout.failed`), deduped the same way, driving the payout state machine in §4.1a.

- Signature verification uses the provider's documented HMAC-SHA256 scheme over the **raw request body** with the webhook secret (distinct secret from the API key/secret) — configured as a raw-body NestJS route.
- Invalid signature → log to `webhook_events` with `signature_valid=false`, `processing_status='invalid_signature'`, return `400`, **do not process**, alert if this happens more than a handful of times/day (possible spoofing attempt).

---

## 4. Savings ledger mechanics

### 4.1 Crediting (already shown in §3.3) — the only credit path is `recordSavings` called from `resolvePaymentSuccess`, plus the admin-adjustment path (`source_type='admin_adjustment'`, requires a `reason`, used only via the internal admin API with its own audit trail).

### 4.1a Payout initiation and completion (new in this revision — PRD §L.5a)

Queued job `initiate-payout`, triggered at the end of `resolvePaymentSuccess`:

```typescript
async function initiatePayout(job: { paymentTxnId: string }) {
  const txn = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: job.paymentTxnId } });
  const destination = await prisma.savingsDestination.findUniqueOrThrow({ where: { id: txn.savingsDestinationId } });

  if (destination.verificationStatus !== 'verified') {
    // Should not happen — §3.1 step 3 blocks payment creation without a verified destination —
    // but re-check defensively; a destination could theoretically be un-verified between
    // payment creation and payout (e.g. user removed it via a race). Treat as payout failure.
    return failPayout(txn.id, 'destination_not_verified');
  }

  const { providerPayoutId } = await payoutProvider.createPayout({
    userId: txn.userId,
    providerBeneficiaryId: destination.providerBeneficiaryId,
    amountPaise: txn.amountPaise,
    currency: 'INR',
    idempotencyKey: txn.savingsIntentId, // NOT payment_transactions.id — ties to the same intent as the collection leg
  });

  await prisma.paymentTransaction.update({
    where: { id: txn.id },
    data: { payoutStatus: 'initiated', providerPayoutId },
  });
}
```

Resolved by the RazorpayX webhook (or the reconciliation sweep, §5.4a) calling one of:
- `resolvePayoutSuccess(paymentTxnId)` → `payout_status = 'completed'`. No ledger change (the credit already exists from §3.3); no user notification (silent success, matches PRD §L.5a).
- `resolvePayoutFailure(paymentTxnId, reason)` → triggers the refund-and-reverse path, §5.4a.

Both are idempotent state transitions on `payment_transactions.payout_status`, structurally identical in spirit to §3.3.

### 4.2 Balance reads

`getBalance()` reads the O(1) `user_savings_balance` cache (database-schema.md §3.7), **not** a live `SUM()` — but a live `SUM()` recomputation is available as `getBalance(userId, { verify: true })` for use in the nightly reconciliation job and in customer-support tooling, to catch any cache drift.

### 4.3 Refund → ledger reversal

Used for both the payout-failure path (§5.4a, the primary/expected reversal scenario in this model) and dispute/chargeback-driven reversals (§5.4b):

```typescript
async function reversePaymentCredit(paymentTxnId: string, refundAmountPaise: bigint, reason: 'payout_failed' | 'dispute' | 'user_error') {
  return prisma.$transaction(async (tx) => {
    const originalCredit = await tx.savingsTransaction.findUnique({ where: { sourcePaymentId: paymentTxnId } });
    if (!originalCredit) return; // payment never succeeded / never credited — nothing to reverse

    // Guard against double-reversal: check no reversal already references this credit
    const existingReversal = await tx.savingsTransaction.findFirst({ where: { reversesTxnId: originalCredit.id } });
    if (existingReversal) return; // already reversed (e.g. webhook replay) — no-op

    const balance = await tx.userSavingsBalance.findUnique({ where: { userId: originalCredit.userId } });
    const newBalance = balance.balancePaise - refundAmountPaise;

    const reversal = await tx.savingsTransaction.create({
      data: {
        userId: originalCredit.userId, entryType: 'reversal',
        amountPaise: -refundAmountPaise, balanceAfterPaise: newBalance,
        sourceType: 'refund_reversal', sourcePaymentId: paymentTxnId,
        reversesTxnId: originalCredit.id,
        description: `Reversal: ${reason}`,
      },
    });
    await tx.userSavingsBalance.update({ where: { userId: originalCredit.userId },
      data: { balancePaise: newBalance, lastTxnId: reversal.id } });

    return reversal;
  }, { isolationLevel: 'Serializable' })
    .then(async (reversal) => {
      // Trigger the actual money movement: refund the ORIGINAL payment source via the collection PA's refund API.
      await paymentProvider.refund({ providerPaymentId: txn.providerPaymentId, amountPaise: refundAmountPaise, reason });
      if (reason === 'payout_failed') {
        await notificationService.send(originalCredit.userId, 'payout_failed_refunded', { amountPaise: refundAmountPaise });
      }
      return reversal;
    });
}
```

### 4.4 No redemption step

The previous revision of this document defined a `redeem()` operation (`voucher` / `donation` / `bank_payout`) because, under the platform-revenue model, the user's "balance" was a claim against the platform that had to be settled somehow. **Under the corrected model, that claim doesn't exist — the money already moved to the user's own account via the payout leg (§4.1a) at save-time.** There is nothing to redeem. `SavingsLedger.redeem()` is removed from the interface (§2); do not reintroduce it without a corresponding change to PRD §L.8, which would only happen if the product adds a genuinely custodial feature (locked goals) requiring a PPI/bank partnership — see PRD `mvp-scope.md` §R.1.

---

## 5. Handling required failure scenarios

### 5.1 Duplicate payments (collection leg)
Covered structurally in database-schema.md §5 and §3.3/§3.4 above: idempotency key on order creation, unique constraint on provider payment ID, single idempotent resolution function.

### 5.1a Duplicate payouts (payout leg)
Same pattern, one leg over: `createPayout` is called with `idempotencyKey = savings_intent_id`, and `payment_transactions.provider_payout_id` is unique-constrained — a retried `initiate-payout` job for the same transaction cannot create two payout attempts. The RazorpayX-side idempotency key additionally protects against a queue-level at-least-once redelivery of the same job.

### 5.2 Duplicate webhooks
`UNIQUE(provider, provider_event_id)` + insert-before-process pattern (§3.4), applied identically to both the collection webhook and the payout webhook.

### 5.3 Payment pending (collection leg)
`status='pending'` is surfaced to the UI honestly (api-spec.md §2.1 uses `202` semantics via the `status` field). The scheduled `PaymentStatusSweeper` job (BullMQ repeatable job, every 5 min) queries all `payment_transactions` where `status IN ('created','pending')` and `created_at < now() - interval '15 minutes'`, calls `getPaymentStatus` for each, and resolves them (success/failure/still-genuinely-pending, in which case it's re-checked next sweep, capped at e.g. 24h before being marked `failed` with reason `timeout`).

### 5.4 Failed payments & refunds (collection leg)
- **Failed**: terminal, no ledger effect, `failure_reason` stored, user sees a clear retry CTA (new `createPayment` call, new idempotency key).
- **Refund — user-initiated** (`POST /payments/{id}/refund-request`): auto-approved and processed immediately if within a short window (e.g., 10 minutes of a successful payment) — else routed to manual admin review (`/admin/payments/{id}/refund`).
- **Refund — provider/bank initiated** (chargeback/dispute): arrives via webhook (`refund.processed` or similar), always goes through `reversePaymentCredit` (§4.3) with `reason='dispute'`.

### 5.4a Payout failure (payout leg) — new failure class in this revision
This is the failure mode that exists **because** the platform forwards money instead of keeping it, and it is the primary reversal scenario in this model (more common in practice than disputes):
- Triggers: invalid/deactivated destination account, the payout provider's own outage, beneficiary re-verification lapsed since setup.
- `PayoutStatusSweeper` (same pattern as §5.3, watching `payout_status='initiated'` rows) and the RazorpayX webhook both resolve to `resolvePayoutFailure`.
- A bounded number of automatic retries (e.g., 3, with backoff, for transient/network-classified failures only — `isRetryable: true` from `PayoutStatusResult`) happen before the failure is treated as terminal.
- On terminal failure: `reversePaymentCredit(paymentTxnId, amountPaise, 'payout_failed')` (§4.3) — refunds the original payment source, reverses the Ledger Entry, notifies the user pointing them at Settings → Savings Destination (SCR-30) to fix it.
- **This must never silently retry forever** — an unresolved payout sitting in `initiated` past the bounded retry+time budget is itself a reconciliation-critical alert (§6), not a background job left running indefinitely.

### 5.5 The negative-balance edge case
Reduced in likelihood versus the previous revision (there's no `redeem()` action competing with a refund for the same credited amount), but still possible: if a `reverse` (§4.3) races a concurrent balance read, the serializable transaction isolation prevents a lost update, but a balance can still legitimately be adjusted by reconciliation (§6) into a temporary negative state if an error is found after the fact. This is **allowed** in the schema (`BIGINT`, no `CHECK >= 0` constraint) — treated as a support/reconciliation signal, not something the system silently blocks.

### 5.6 Reconciliation
Nightly job (`ReconciliationService`, runs off-peak, e.g. 3 AM IST):
1. Fetch Razorpay's settlement/transactions report **and** RazorpayX's payout report for the prior 24–48h window via their reporting APIs.
2. For each collection record: find matching `payment_transactions` by `provider_payment_id`. Flag mismatches (provider has a captured payment we have no succeeded row for; we have `succeeded` but provider shows failed/refunded; amount mismatches) — all **critical**, page on-call.
3. For each payout record: find matching `payment_transactions` by `provider_payout_id`. Flag: a `succeeded` collection with no payout attempt at all (should never happen — the queue job is the only path to a payout, but a queue failure could theoretically drop it); a payout stuck `initiated` beyond the retry+time budget (§5.4a); a payout the provider shows completed that our system still shows `initiated` (webhook + sweep both missed it — critical, resolve and check `payout_status` before assuming this is even possible with the sweep in place).
4. Recompute every active user's ledger balance from `SUM(savings_transactions.amount_paise)` and diff against `user_savings_balance` — any non-zero diff is a bug alert.
5. Publish a report to `/admin/reconciliation/report` and Slack/email alert on any critical flags.

### 5.7 Fraud & manipulated client requests
- **Price/amount tampering**: impossible by construction — `amount_paise` is always server-computed from the user's own `smoking_profiles` row (`cost_per_stick_paise * quantity`, snapshotted onto `payment_transactions` at creation time), never accepted from the client (database-schema.md §3.5/§5). This holds regardless of whether that profile's `cost_per_stick_paise` originated from pack-mode division or a direct single-stick entry (database-schema.md §3.2) — the payment path only ever reads the one, already-resolved field.
- **Unreasonable self-reported price at profile configuration time** (not a fraud vector against another party — it's the user's own price — but a fat-finger-entry risk that could otherwise trigger a surprisingly large real payment): `POST`/`PATCH /smoking-profiles` rejects `pack_price_paise` and `cost_per_stick_paise` values outside configurable sanity bounds (e.g., ₹1–₹2,000 per pack, ₹0.10–₹200 per stick — exact thresholds are a product decision, not fixed here) with `422 price_out_of_range`. This is a data-entry safeguard, independent of the "never trust the client at payment time" rule above.
- **Velocity/abuse**: Redis-backed counters enforce max payment attempts per user per hour/day and per device fingerprint per day; exceeding triggers a temporary cooldown (`429`) and raises `users.risk_score`.
- **Signature/replay tampering on `verify`**: server recomputes the HMAC itself from its own webhook/API secret — a client cannot forge a valid signature without the secret, which never leaves the server.
- **Fraudulent Savings Destinations** (e.g., registering someone else's account to funnel payouts): beneficiary registration goes through the payout provider's own verification (penny-drop / VPA validation with name match against the account holder), required **at MVP** (this is not a Phase 2 KYC gate anymore — it's a precondition of the payout leg working at all, per PRD §L.1). A mismatch between the verified account holder name and the user's own profile name is flagged for manual review before the destination can be used.
- See [security.md](./security.md) §6 for the general fraud-controls framework this plugs into.

### 5.8 User deleting account with a nonzero ledger balance
Per database-schema.md §7, `payment_transactions`/`savings_transactions` are retained (anonymized-by-reference) regardless of deletion. **This is simpler under the corrected model than the previous revision assumed**: there is no "force redemption before deletion" question, because the ledger balance was never money the platform was holding — every past save's money already left to the user's own account via its payout leg at the time it happened. Account deletion can proceed on the same timeline as any other data category (§7), with the ledger history retained/anonymized like any other financial record, no special blocking step required.

---

## 6. Reconciliation job — data flow summary

```
Cron (nightly) → ReconciliationService.run()
  ├─ fetchProviderSettlementReport(collectionProvider, dateRange)
  ├─ fetchProviderPayoutReport(payoutProvider, dateRange)
  ├─ diffAgainstLocal(payment_transactions, both legs)      → critical alerts on mismatch
  ├─ recomputeLedgerBalances()                              → diff vs user_savings_balance cache
  └─ writeReport() → audit_log + admin dashboard + alert channel
```

---

## 7. Phase roadmap recap

| Phase | Money movement | Funds custody model |
|---|---|---|
| MVP | Collection (Razorpay) + automatic payout (RazorpayX Payouts) to the user's own Savings Destination, per transaction | Never custodial — every collected rupee is forwarded out to the user in the same flow; the platform nets nothing (PRD §L) |
| Future (explicitly out of MVP/V1) | Optional **locked/custodial savings goals** with a bonus/interest incentive | Requires a licensed PPI partner or bank-partnered escrow holding funds for a period — a genuinely different feature, not a natural extension of MVP payouts. See PRD `mvp-scope.md` §R.1. |

Do not build a locked/custodial goals feature against real money without sign-off from whoever is handling the company's RBI/PA-PG compliance — this is a legal gate, not a technical one.
