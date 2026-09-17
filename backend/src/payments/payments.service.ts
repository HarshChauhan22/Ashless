import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MockPaymentProviderService, MockOutcome } from "./mock-payment-provider.service";

// Ported from webapp/app/api/payments/**/route.ts, now backed by real
// Postgres with the documented integrity guarantees actually enforced by
// the database, not just application logic (database-schema.md §5/§6):
// unique (user_id, idempotency_key) makes duplicate-payment creation a
// no-op; unique source_payment_id on savings_transactions makes double-
// crediting structurally impossible; the ledger write runs inside a
// Serializable transaction per the doc's own Prisma-specific note. See
// DECISIONS.md D-012.
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockProvider: MockPaymentProviderService,
  ) {}

  async create(
    userId: string,
    idempotencyKey: string | null,
    body: { smokingProfileId?: string; quantity?: number; cravingSessionId?: string; simulateOutcome?: MockOutcome },
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({ code: "idempotency_key_required", message: "Missing Idempotency-Key." });
    }

    const existing = await this.prisma.paymentTransaction.findFirst({ where: { userId, idempotencyKey } });
    if (existing) return this.toClientShape(existing);

    const profile = await this.prisma.smokingProfile.findFirst({ where: { id: body.smokingProfileId ?? "", userId } });
    if (!profile) throw new NotFoundException({ code: "not_found", message: "Smoking profile not found." });

    const qty = Number(body.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 60) {
      throw new BadRequestException({ code: "invalid_quantity", message: "Quantity must be between 1 and 60." });
    }

    const session = await this.prisma.cravingSession.findFirst({ where: { id: body.cravingSessionId ?? "", userId } });
    if (!session) throw new NotFoundException({ code: "not_found", message: "Craving session not found." });

    // Server-computed, full stop — this is the line that makes "never trust
    // a client-supplied amount" true rather than asserted.
    const amountPaise = profile.costPerStickPaise * BigInt(qty);
    if (amountPaise <= 0n) {
      throw new BadRequestException({ code: "invalid_amount", message: "Computed amount must be positive." });
    }

    const order = this.mockProvider.createPayment(amountPaise, body.simulateOutcome ?? "success");

    const txn = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        smokingProfileId: profile.id,
        unitPricePaiseSnapshot: profile.costPerStickPaise,
        quantity: qty,
        amountPaise,
        providerOrderId: order.providerOrderId,
        idempotencyKey,
        status: "created",
      },
    });

    await this.prisma.cravingSession.update({ where: { id: session.id }, data: { linkedPaymentId: txn.id } });

    return this.toClientShape(txn);
  }

  async verify(userId: string, paymentId: string) {
    const txn = await this.prisma.paymentTransaction.findFirst({ where: { id: paymentId, userId } });
    if (!txn) throw new NotFoundException({ code: "not_found", message: "Payment not found." });

    if (txn.status === "succeeded") {
      const balance = await this.prisma.userSavingsBalance.findUnique({ where: { userId } });
      return { status: "succeeded", balancePaise: balance?.balancePaise ?? 0n };
    }
    if (txn.status === "failed" || txn.status === "cancelled") {
      throw new ConflictException({ code: "payment_already_processed", message: "This payment already reached a terminal state." });
    }

    const providerStatus = this.mockProvider.getPaymentStatus(txn.providerOrderId);
    if (!providerStatus) throw new NotFoundException({ code: "not_found", message: "No matching provider order." });

    // Amount tamper check — what the "provider" captured must equal what we
    // quoted, which was itself server-computed at creation time.
    if (providerStatus.amountPaise !== txn.amountPaise) {
      throw new ConflictException({ code: "amount_mismatch", message: "Amount mismatch between order and payment." });
    }

    if (providerStatus.status === "pending") {
      await this.prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "pending" } });
      return { status: "pending" };
    }
    if (providerStatus.status === "failed") {
      await this.prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "failed" } });
      return { status: "failed" };
    }

    // --- succeeded: the one place a craving session becomes
    // 'simulated_purchase' and the one place money moves. Runs inside a
    // Serializable transaction per database-schema.md §6's own guidance on
    // the read-check-write ledger sequence, so a webhook and a client
    // verify call can never race into a double credit.
    const result = await this.prisma.$transaction(
      async (tx) => {
        const fresh = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: txn.id } });
        if (fresh.status === "succeeded") {
          const balance = await tx.userSavingsBalance.findUnique({ where: { userId } });
          return { status: "succeeded" as const, balancePaise: balance?.balancePaise ?? 0n, alreadyDone: true };
        }

        await tx.paymentTransaction.update({ where: { id: txn.id }, data: { status: "succeeded", verifiedAt: new Date() } });

        const balanceRow = await tx.userSavingsBalance.upsert({
          where: { userId },
          update: {},
          create: { userId, balancePaise: 0n },
        });
        const newBalance = balanceRow.balancePaise + fresh.amountPaise;

        await tx.savingsTransaction.create({
          data: {
            userId,
            entryType: "credit",
            amountPaise: fresh.amountPaise,
            balanceAfterPaise: newBalance,
            sourceType: "payment",
            sourcePaymentId: fresh.id,
            description: "Redirected craving",
          },
        });
        await tx.userSavingsBalance.update({ where: { userId }, data: { balancePaise: newBalance } });
        await tx.smokingProfile.update({ where: { id: fresh.smokingProfileId }, data: { lastUsedAt: new Date() } });

        const session = await tx.cravingSession.findFirst({ where: { linkedPaymentId: fresh.id, userId } });
        if (session) {
          await tx.cravingSession.update({
            where: { id: session.id },
            data: { outcome: "simulated_purchase", copingAction: "smoking_room", endedAt: new Date() },
          });
        }

        return { status: "succeeded" as const, balancePaise: newBalance, alreadyDone: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { status: result.status, balancePaise: result.balancePaise };
  }

  private toClientShape(t: { id: string; status: string; amountPaise: bigint; quantity: number }) {
    return { paymentId: t.id, status: t.status, amountPaise: t.amountPaise, quantity: t.quantity };
  }
}
