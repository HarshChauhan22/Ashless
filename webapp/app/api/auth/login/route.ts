import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

// Mock phone+OTP per security.md §2.1's shape, without real Firebase/SMS.
// Any 10-digit phone number is accepted; the OTP is always "123456" in this
// prototype (shown on-screen) so the flow is testable without a real SMS
// provider. Swapping in the real Firebase-ID-token flow later is a
// route-handler-only change — the client contract (phone -> OTP -> session)
// stays the same.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phoneNumber, otp } = body as { phoneNumber?: string; otp?: string };

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
    return NextResponse.json({ error: { code: "invalid_phone", message: "Enter a valid 10-digit number." } }, { status: 400 });
  }
  if (otp !== "123456") {
    return NextResponse.json({ error: { code: "invalid_otp", message: "That code didn't match. Try again." } }, { status: 400 });
  }

  const user = getOrCreateUser(phoneNumber);
  trackEvent("login_completed", { userId: user.id });
  return NextResponse.json({ data: { userId: user.id, phoneNumber: user.phoneNumber } });
}
