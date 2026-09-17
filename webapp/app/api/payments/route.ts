import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, newId, type PaymentTransaction } from "@/lib/db";
import { mockCreatePayment, type MockOutcome } from "@/lib/payment-provider";
import { trackEvent } from "@/lib/analytics";

// IMPORTANT FINANCIAL RULE (see the brief + payment-architecture.md §5.7):
// the client sends smokingProfileId + quantity ONLY. There is no "amount"
// field in this request body's type at all — even if a caller sends one, it
// is never read below. amountPaise is always server-computed from the
// user's OWN smoking_profiles row, exactly like the documented
// `POST /v1/payments` contract (api-spec.md §3.6/§4).
export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  const { smokingProfileId, quantity, cravingSessionId, simulateOutcome } = body as {
    smokingProfileId?: string;
    quantity?: number;
    cravingSessionId?: string;
    simulateOutcome?: MockOutcome; // QA-only hook, see payment-provider.ts — never exposed in the real UI
  };
  // Per api-spec.md §1: Idempotency-Key is an HTTP header, not a body field —
  // read it from there (a prior version of this route read it from the body,
  // which the client never populated, and every payment attempt 400'd).
  const idempotencyKey = req.headers.get("Idempotency-Key");

  if (!idempotencyKey) {
    return NextResponse.json({ error: { code: "idempotency_key_required", message: "Missing Idempotency-Key." } }, { status: 400 });
  }
  const dedupeKey = `${userId}:${idempotencyKey}`;
  const existing = [...db.paymentTransactions.values()].find((p) => `${p.userId}:${p.idempotencyKey}` === dedupeKey);
  if (existing) {
    // Duplicate-payment defense per database-schema.md §5 — same key returns the
    // existing result instead of creating a second charge.
    return NextResponse.json({ data: toClientShape(existing) }, { status: 200 });
  }

  const profile = db.smokingProfiles.get(smokingProfileId ?? "");
  if (!profile || profile.userId !== userId) {
    return NextResponse.json({ error: { code: "not_found", message: "Smoking profile not found." } }, { status: 404 });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 60) {
    return NextResponse.json({ error: { code: "invalid_quantity", message: "Quantity must be between 1 and 60." } }, { status: 400 });
  }
  const session = db.cravingSessions.get(cravingSessionId ?? "");
  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: { code: "not_found", message: "Craving session not found." } }, { status: 404 });
  }

  // Server-computed, full stop — this is the line that makes "never trust a
  // client-supplied amount" true rather than asserted.
  const amountPaise = profile.costPerStickPaise * qty;
  if (amountPaise <= 0) {
    return NextResponse.json({ error: { code: "invalid_amount", message: "Computed amount must be positive." } }, { status: 400 });
  }

  const order = mockCreatePayment(amountPaise, simulateOutcome ?? "success");
  const txn: PaymentTransaction = {
    id: newId("pay"),
    userId,
    cravingSessionId: session.id,
    smokingProfileId: profile.id,
    unitPricePaiseSnapshot: profile.costPerStickPaise,
    quantity: qty,
    amountPaise,
    status: "created",
    idempotencyKey,
    providerOrderId: order.providerOrderId,
    createdAt: new Date().toISOString(),
    verifiedAt: null,
  };
  db.paymentTransactions.set(txn.id, txn);
  session.linkedPaymentId = txn.id;
  db.cravingSessions.set(session.id, session);

  // cigarette_brand_selected / cigarette_quantity_selected / smoking_room_opened
  // fire client-side at the actual UI moments (BrandStep/QuantityStep/page.tsx)
  // per docs/product/analytics.md's screen mapping — this route's own events
  // start at "SAVE" being tapped (SCR-16), which is what actually happens here.
  trackEvent("savings_intent_created", { userId, paymentId: txn.id, amountInr: amountPaise, quantity: qty, profileId: profile.id });
  trackEvent("payment_started", { userId, paymentId: txn.id, providerOrderId: order.providerOrderId });

  return NextResponse.json({ data: { ...toClientShape(txn), providerOrderId: order.providerOrderId } }, { status: 201 });
}

function toClientShape(t: PaymentTransaction) {
  return {
    paymentId: t.id,
    status: t.status,
    amountPaise: t.amountPaise,
    quantity: t.quantity,
  };
}
