import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, listSmokingProfiles, newId, type SmokingProfile } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;
  return NextResponse.json({ data: listSmokingProfiles(userId) });
}

// Same endpoint used for onboarding-style setup AND the Digital Smoking
// Room's inline "I can't find my brand" custom entry (PRD SCR-05/SCR-14 share
// this contract per api-spec.md §3.3). The server — never the client —
// resolves cost-per-stick when pricingMode is 'pack', per Immutable Rule 3.
export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  const { brandLabel, pricingMode, packPricePaise, packSize, costPerStickPaise, isPrimary, entryPoint } = body as {
    brandLabel?: string;
    pricingMode?: "pack" | "single_stick";
    packPricePaise?: number;
    packSize?: number;
    costPerStickPaise?: number;
    isPrimary?: boolean;
    entryPoint?: "onboarding" | "smoking_room";
  };

  if (!brandLabel || !brandLabel.trim()) {
    return NextResponse.json({ error: { code: "brand_required", message: "Enter a brand name." } }, { status: 400 });
  }
  if (pricingMode !== "pack" && pricingMode !== "single_stick") {
    return NextResponse.json({ error: { code: "invalid_pricing_configuration", message: "Choose pack or single-stick pricing." } }, { status: 400 });
  }

  let resolvedCostPerStick: number;
  if (pricingMode === "pack") {
    if (!packPricePaise || packPricePaise <= 0 || !packSize || packSize <= 0) {
      return NextResponse.json({ error: { code: "invalid_pricing_configuration", message: "Enter a valid pack price and pack size." } }, { status: 400 });
    }
    if (packPricePaise > 2000) {
      return NextResponse.json({ error: { code: "price_out_of_range", message: "That pack price looks too high — double check it." } }, { status: 422 });
    }
    resolvedCostPerStick = Math.round(packPricePaise / packSize);
  } else {
    if (!costPerStickPaise || costPerStickPaise <= 0) {
      return NextResponse.json({ error: { code: "invalid_pricing_configuration", message: "Enter a valid per-cigarette price." } }, { status: 400 });
    }
    if (costPerStickPaise > 200) {
      return NextResponse.json({ error: { code: "price_out_of_range", message: "That per-cigarette price looks too high — double check it." } }, { status: 422 });
    }
    resolvedCostPerStick = costPerStickPaise;
  }

  const existing = listSmokingProfiles(userId);
  const profile: SmokingProfile = {
    id: newId("profile"),
    userId,
    brandLabel: brandLabel.trim(),
    pricingMode,
    packPricePaise: pricingMode === "pack" ? packPricePaise! : null,
    packSize: pricingMode === "pack" ? packSize! : null,
    costPerStickPaise: resolvedCostPerStick,
    isPrimary: isPrimary ?? existing.length === 0, // first profile is primary by default
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  };
  db.smokingProfiles.set(profile.id, profile);
  trackEvent("custom_brand_created", { userId, profileId: profile.id, pricingMode, entryPoint: entryPoint ?? "onboarding" });

  return NextResponse.json({ data: profile }, { status: 201 });
}
