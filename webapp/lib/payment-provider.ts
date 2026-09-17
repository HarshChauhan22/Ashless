// Stands in for RazorpayPaymentProvider per docs/architecture/payment-architecture.md
// §2's PaymentProvider interface. Same shape, no real money movement.
// A "payout leg" (PayoutProvider, §2) is out of scope for this prototype —
// there is no real Savings Destination to pay out to yet; the prototype
// treats the ledger credit as final once the mock collection leg verifies,
// which is enough to prove out the "never trust the client" rule this
// exercise cares about.

export type MockOutcome = "success" | "failed" | "pending";

export interface MockOrder {
  providerOrderId: string;
  amountPaise: number;
  outcome: MockOutcome;
  createdAt: number;
}

// Persisted on globalThis for the same reason as lib/db.ts's store: Next.js
// dev compiles each API route as its own bundle, so a plain module-level
// variable here is NOT actually shared between /api/payments (which creates
// the order) and /api/payments/[id]/verify (which reads it back) — each
// route got its own empty copy, and verify always 404'd. globalThis is the
// one thing guaranteed to be the same object across all route bundles in a
// single Node process.
declare global {
  // eslint-disable-next-line no-var
  var __ashlessMockOrders: Map<string, MockOrder> | undefined;
}
const orders: Map<string, MockOrder> = globalThis.__ashlessMockOrders ?? (globalThis.__ashlessMockOrders = new Map());

export function mockCreatePayment(amountPaise: number, simulateOutcome: MockOutcome = "success"): MockOrder {
  const order: MockOrder = {
    providerOrderId: `mock_order_${Math.random().toString(36).slice(2, 10)}`,
    amountPaise,
    outcome: simulateOutcome,
    createdAt: Date.now(),
  };
  orders.set(order.providerOrderId, order);
  return order;
}

/** Mirrors PaymentProvider.getPaymentStatus — the only source of truth for
 * whether money actually moved. The API route calling this is the one place
 * "payment succeeded" is allowed to become true; the client never decides. */
export function mockGetPaymentStatus(providerOrderId: string): { status: MockOutcome; amountPaise: number } | null {
  const order = orders.get(providerOrderId);
  if (!order) return null;
  return { status: order.outcome, amountPaise: order.amountPaise };
}
