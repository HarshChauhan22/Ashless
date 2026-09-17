import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, newId, type SavingsTransaction } from "@/lib/db";
import { mockGetPaymentStatus } from "@/lib/payment-provider";
import { trackEvent } from "@/lib/analytics";

// This is the one route in the prototype allowed to turn a payment into a
// ledger credit — mirrors resolvePaymentSuccess() in
// docs/architecture/payment-architecture.md §3.3. The client's role here is
// only to *trigger* a check; the actual status comes from
// mockGetPaymentStatus (standing in for the PA's server API / webhook), never
// from anything the client asserts. Calling this twice for the same payment
// is a safe no-op (idempotent on payment id, matching the documented
// UNIQUE(source_payment_id) ledger constraint).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const txn = db.paymentTransactions.get(params.id);
  if (!txn || txn.userId !== userId) {
    return NextResponse.json({ error: { code: "not_found", message: "Payment not found." } }, { status: 404 });
  }

  if (txn.status === "succeeded") {
    // Already resolved — idempotent no-op, not an error (payment-architecture.md §3.3).
    return NextResponse.json({ data: { status: "succeeded", balancePaise: db.walletBalance.get(userId) ?? 0 } });
  }
  if (txn.status === "failed" || txn.status === "cancelled") {
    return NextResponse.json({ error: { code: "payment_already_processed", message: "This payment already reached a terminal state." } }, { status: 409 });
  }

  const providerStatus = mockGetPaymentStatus(txn.providerOrderId);
  if (!providerStatus) {
    return NextResponse.json({ error: { code: "not_found", message: "No matching provider order." } }, { status: 404 });
  }

  // Amount tamper check — what the "provider" captured must equal what we
  // quoted, which was itself server-computed at creation time (never trust
  // a client-supplied amount at any step of this pipeline).
  if (providerStatus.amountPaise !== txn.amountPaise) {
    return NextResponse.json({ error: { code: "amount_mismatch", message: "Amount mismatch between order and payment." } }, { status: 409 });
  }

  if (providerStatus.status === "pending") {
    txn.status = "pending";
    db.paymentTransactions.set(txn.id, txn);
    trackEvent("payment_pending", { userId, paymentId: txn.id });
    return NextResponse.json({ data: { status: "pending" } }, { status: 202 });
  }

  if (providerStatus.status === "failed") {
    txn.status = "failed";
    db.paymentTransactions.set(txn.id, txn);
    trackEvent("payment_failed", { userId, paymentId: txn.id, failureReason: "mock_declined" });
    return NextResponse.json({ data: { status: "failed" } });
  }

  // --- succeeded ---
  txn.status = "succeeded";
  txn.verifiedAt = new Date().toISOString();
  db.paymentTransactions.set(txn.id, txn);

  const prevBalance = db.walletBalance.get(userId) ?? 0;
  const newBalance = prevBalance + txn.amountPaise;
  const ledgerEntry: SavingsTransaction = {
    id: newId("ledger"),
    userId,
    entryType: "credit",
    amountPaise: txn.amountPaise,
    balanceAfterPaise: newBalance,
    sourceType: "payment",
    sourcePaymentId: txn.id,
    description: "Redirected craving",
    createdAt: new Date().toISOString(),
  };
  db.savingsTransactions.push(ledgerEntry);
  db.walletBalance.set(userId, newBalance);

  const profile = db.smokingProfiles.get(txn.smokingProfileId);
  if (profile) {
    profile.lastUsedAt = new Date().toISOString();
    db.smokingProfiles.set(profile.id, profile);
  }

  // This is the ONLY place a craving session becomes 'simulated_purchase' —
  // see app/api/craving-sessions/[id]/route.ts's comment on why that route
  // refuses to accept this outcome directly. The smoke-free streak is
  // computed only from 'smoked' outcomes (lib/db.ts computeStreak), so this
  // assignment cannot break the streak — see the CRITICAL STREAK RULE.
  const session = db.cravingSessions.get(txn.cravingSessionId);
  if (session) {
    session.outcome = "simulated_purchase";
    session.copingAction = "smoking_room";
    session.endedAt = new Date().toISOString();
    session.linkedPaymentId = txn.id;
    db.cravingSessions.set(session.id, session);
  }

  trackEvent("payment_success", { userId, paymentId: txn.id, ledgerEntryId: ledgerEntry.id, amountInr: txn.amountPaise });
  trackEvent("savings_recorded", { userId, ledgerEntryId: ledgerEntry.id, amountInr: txn.amountPaise, newWalletBalanceInr: newBalance });
  trackEvent("craving_payment_redirect_completed", { userId, cravingSessionId: txn.cravingSessionId, paymentId: txn.id, amountInr: txn.amountPaise });
  trackEvent("craving_handled", { userId, cravingSessionId: txn.cravingSessionId, resolution: "simulated_purchase" });

  return NextResponse.json({ data: { status: "succeeded", balancePaise: newBalance, ledgerEntryId: ledgerEntry.id } });
}
