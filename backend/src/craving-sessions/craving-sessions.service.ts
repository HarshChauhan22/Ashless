import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const ALLOWED_OUTCOMES_HERE = ["resisted", "smoked", "abandoned", "unresolved"];

// Ported 1:1 from webapp/app/api/craving-sessions/**/route.ts. The CRITICAL
// STREAK RULE lives here by construction: this route can never set outcome
// to 'simulated_purchase' — only PaymentsService.verify() does that, after
// server-side payment verification (see payments.service.ts). See
// DECISIONS.md D-012 and the original CRITICAL STREAK RULE addendum.
@Injectable()
export class CravingSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string) {
    return this.prisma.cravingSession.create({ data: { userId } });
  }

  async update(
    userId: string,
    id: string,
    body: { outcome?: string; copingAction?: string; intensity?: string; trigger?: string },
  ) {
    const session = await this.prisma.cravingSession.findFirst({ where: { id, userId } });
    if (!session) throw new NotFoundException({ code: "not_found", message: "Craving session not found." });

    const data: Record<string, unknown> = {};
    if (body.intensity !== undefined) data.intensity = body.intensity;
    if (body.trigger !== undefined) data.trigger = body.trigger || null;

    if (body.outcome) {
      if (!ALLOWED_OUTCOMES_HERE.includes(body.outcome)) {
        throw new ForbiddenException({ code: "outcome_not_allowed", message: "This outcome can only be set by a verified event." });
      }
      data.outcome = body.outcome;
      data.endedAt = new Date();
    }
    if (body.copingAction) data.copingAction = body.copingAction;

    return this.prisma.cravingSession.update({ where: { id }, data });
  }
}
