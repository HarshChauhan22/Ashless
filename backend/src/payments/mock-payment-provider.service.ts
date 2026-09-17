import { Injectable } from "@nestjs/common";

// Stands in for a RazorpayPaymentProvider per payment-architecture.md's
// PaymentProvider interface — same shape, no real money movement. A "payout
// leg" is out of scope until Phase 6 (real provider relationship + a
// verified Savings Destination to pay out to); the ledger credit is treated
// as final once the mock collection leg verifies, which is enough to prove
// the "never trust the client" rule end-to-end. Unlike the web prototype,
// this runs as a single long-lived Nest process, so a plain in-memory Map
// is genuinely shared across requests — no globalThis workaround needed.
export type MockOutcome = "success" | "failed" | "pending";

interface MockOrder {
  providerOrderId: string;
  amountPaise: bigint;
  outcome: MockOutcome;
  createdAt: number;
}

@Injectable()
export class MockPaymentProviderService {
  private readonly orders = new Map<string, MockOrder>();

  createPayment(amountPaise: bigint, simulateOutcome: MockOutcome = "success"): MockOrder {
    const order: MockOrder = {
      providerOrderId: `mock_order_${Math.random().toString(36).slice(2, 10)}`,
      amountPaise,
      outcome: simulateOutcome,
      createdAt: Date.now(),
    };
    this.orders.set(order.providerOrderId, order);
    return order;
  }

  getPaymentStatus(providerOrderId: string): { status: MockOutcome; amountPaise: bigint } | null {
    const order = this.orders.get(providerOrderId);
    if (!order) return null;
    return { status: order.outcome, amountPaise: order.amountPaise };
  }
}
