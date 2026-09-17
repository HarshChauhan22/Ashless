import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface UpsertBody {
  brandLabel?: string;
  pricingMode?: "pack" | "single_stick";
  packPricePaise?: number;
  packSize?: number;
  costPerStickPaise?: number;
  isPrimary?: boolean;
}

// Ported 1:1 from webapp/app/api/smoking-profiles/**/route.ts — same
// validation, same price sanity ceilings (database-schema.md §5's "fat
// finger" row), same "resolve cost-per-stick server-side in pack mode"
// rule (Immutable Rule 3). See DECISIONS.md D-012.
@Injectable()
export class SmokingProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.smokingProfile.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { lastUsedAt: { sort: "desc", nulls: "last" } }],
    });
  }

  async create(userId: string, body: UpsertBody & { entryPoint?: string }) {
    if (!body.brandLabel || !body.brandLabel.trim()) {
      throw new BadRequestException({ code: "brand_required", message: "Enter a brand name." });
    }
    if (body.pricingMode !== "pack" && body.pricingMode !== "single_stick") {
      throw new BadRequestException({ code: "invalid_pricing_configuration", message: "Choose pack or single-stick pricing." });
    }

    const { pricingMode, packPricePaise, packSize, costPerStick } = this.resolvePricing(body);

    const existingCount = await this.prisma.smokingProfile.count({ where: { userId } });

    return this.prisma.smokingProfile.create({
      data: {
        userId,
        brandLabel: body.brandLabel.trim(),
        pricingMode,
        packPricePaise: pricingMode === "pack" ? BigInt(packPricePaise!) : null,
        packSize: pricingMode === "pack" ? packSize! : null,
        costPerStickPaise: BigInt(costPerStick),
        isPrimary: body.isPrimary ?? existingCount === 0,
      },
    });
  }

  async update(userId: string, id: string, body: UpsertBody) {
    const profile = await this.prisma.smokingProfile.findFirst({ where: { id, userId } });
    if (!profile) throw new NotFoundException({ code: "not_found", message: "Profile not found." });

    const data: Record<string, unknown> = {};
    if (body.brandLabel !== undefined) data.brandLabel = body.brandLabel.trim();

    if (body.pricingMode !== undefined) {
      const { pricingMode, packPricePaise, packSize, costPerStick } = this.resolvePricing(body);
      data.pricingMode = pricingMode;
      data.packPricePaise = pricingMode === "pack" ? BigInt(packPricePaise!) : null;
      data.packSize = pricingMode === "pack" ? packSize! : null;
      data.costPerStickPaise = BigInt(costPerStick);
    }

    if (body.isPrimary === true) {
      // Exactly one primary per user — app-layer invariant (database-schema.md §3.2).
      await this.prisma.smokingProfile.updateMany({ where: { userId }, data: { isPrimary: false } });
      data.isPrimary = true;
    }

    return this.prisma.smokingProfile.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const profile = await this.prisma.smokingProfile.findFirst({ where: { id, userId } });
    if (!profile) throw new NotFoundException({ code: "not_found", message: "Profile not found." });

    const remaining = await this.prisma.smokingProfile.count({ where: { userId } });
    if (remaining === 1) {
      throw new ConflictException({ code: "last_profile", message: "This is your only profile — add another before deleting this one." });
    }

    await this.prisma.smokingProfile.delete({ where: { id } });
    if (profile.isPrimary) {
      const next = await this.prisma.smokingProfile.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
      if (next) await this.prisma.smokingProfile.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return { deleted: true };
  }

  private resolvePricing(body: UpsertBody) {
    if (body.pricingMode === "pack") {
      if (!body.packPricePaise || body.packPricePaise <= 0 || !body.packSize || body.packSize <= 0) {
        throw new BadRequestException({ code: "invalid_pricing_configuration", message: "Enter a valid pack price and pack size." });
      }
      if (body.packPricePaise > 2000) {
        throw new BadRequestException({ code: "price_out_of_range", message: "That pack price looks too high — double check it." });
      }
      return {
        pricingMode: "pack" as const,
        packPricePaise: body.packPricePaise,
        packSize: body.packSize,
        costPerStick: Math.round(body.packPricePaise / body.packSize),
      };
    }
    if (!body.costPerStickPaise || body.costPerStickPaise <= 0) {
      throw new BadRequestException({ code: "invalid_pricing_configuration", message: "Enter a valid per-cigarette price." });
    }
    if (body.costPerStickPaise > 200) {
      throw new BadRequestException({ code: "price_out_of_range", message: "That per-cigarette price looks too high — double check it." });
    }
    return { pricingMode: "single_stick" as const, packPricePaise: undefined, packSize: undefined, costPerStick: body.costPerStickPaise };
  }
}
