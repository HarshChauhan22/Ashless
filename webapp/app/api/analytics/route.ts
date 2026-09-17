import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import { requireUserId } from "@/lib/auth";

// Debug/QA-only GET (not part of the documented API spec) so the test
// journeys in this task's brief can be verified by inspection: open
// /api/analytics in a browser tab alongside the app to watch events fire.
export async function GET() {
  return NextResponse.json({ data: db.analyticsEvents.slice(-100).reverse() });
}

// Client-originated UX events only (screen views, taps) — mirrors
// docs/architecture/api-spec.md §3.10: never used for financial events,
// which are always server-emitted internally from the payment/ledger routes.
export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;
  const body = await req.json().catch(() => ({}));
  const { eventName, properties } = body as { eventName?: string; properties?: Record<string, unknown> };
  if (!eventName) return NextResponse.json({ error: { code: "event_name_required", message: "Missing eventName." } }, { status: 400 });
  trackEvent(eventName, { userId, ...(properties ?? {}) });
  return NextResponse.json({ data: { logged: true } });
}
