import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, listSmokingProfiles } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

// Same validation as POST /api/smoking-profiles — editing price/pack size
// takes effect for future transactions only; past payment_transactions rows
// keep their own unit_price_paise_snapshot (database-schema.md §3.5),
// which this route never touches.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const profile = db.smokingProfiles.get(params.id);
  if (!profile || profile.userId !== userId) {
    return NextResponse.json({ error: { code: "not_found", message: "Profile not found." } }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { brandLabel, pricingMode, packPricePaise, packSize, costPerStickPaise, isPrimary } = body as {
    brandLabel?: string;
    pricingMode?: "pack" | "single_stick";
    packPricePaise?: number;
    packSize?: number;
    costPerStickPaise?: number;
    isPrimary?: boolean;
  };

  if (brandLabel !== undefined) profile.brandLabel = brandLabel.trim();

  if (pricingMode !== undefined) {
    if (pricingMode === "pack") {
      if (!packPricePaise || packPricePaise <= 0 || !packSize || packSize <= 0) {
        return NextResponse.json({ error: { code: "invalid_pricing_configuration", message: "Enter a valid pack price and pack size." } }, { status: 400 });
      }
      profile.pricingMode = "pack";
      profile.packPricePaise = packPricePaise;
      profile.packSize = packSize;
      profile.costPerStickPaise = Math.round(packPricePaise / packSize);
    } else {
      if (!costPerStickPaise || costPerStickPaise <= 0) {
        return NextResponse.json({ error: { code: "invalid_pricing_configuration", message: "Enter a valid per-cigarette price." } }, { status: 400 });
      }
      profile.pricingMode = "single_stick";
      profile.packPricePaise = null;
      profile.packSize = null;
      profile.costPerStickPaise = costPerStickPaise;
    }
  }

  if (isPrimary === true) {
    // Exactly one primary per user — flip every other profile off (app-layer
    // invariant, matches database-schema.md §3.2's note that this is
    // enforced in application logic, not a DB constraint).
    for (const p of listSmokingProfiles(userId)) {
      p.isPrimary = p.id === profile.id;
      db.smokingProfiles.set(p.id, p);
    }
  }

  db.smokingProfiles.set(profile.id, profile);
  return NextResponse.json({ data: profile });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const profile = db.smokingProfiles.get(params.id);
  if (!profile || profile.userId !== userId) {
    return NextResponse.json({ error: { code: "not_found", message: "Profile not found." } }, { status: 404 });
  }
  const remaining = listSmokingProfiles(userId);
  if (remaining.length === 1) {
    return NextResponse.json(
      { error: { code: "last_profile", message: "This is your only profile — add another before deleting this one." } },
      { status: 409 }
    );
  }

  db.smokingProfiles.delete(profile.id);
  if (profile.isPrimary) {
    const next = listSmokingProfiles(userId)[0];
    if (next) {
      next.isPrimary = true;
      db.smokingProfiles.set(next.id, next);
    }
  }
  trackEvent("smoking_profile_deleted", { userId, profileId: profile.id });
  return NextResponse.json({ data: { deleted: true } });
}
