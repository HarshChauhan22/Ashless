import { NextRequest, NextResponse } from "next/server";

// Deliberately minimal per the brief ("do not overbuild authentication yet").
// Stands in for JWT-bearer auth (security.md §2.2): the client holds an
// opaque userId (returned at login, stored in localStorage) and sends it as
// a header. There is no token signing/expiry here — this is a prototype
// auth boundary, not a security boundary. Swapping in real phone+OTP/JWT
// (security.md §2.1-2.3) is a lib/auth.ts-only change; no route handler
// should need to change shape.
export function requireUserId(req: NextRequest): string | NextResponse {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Missing session." } }, { status: 401 });
  }
  return userId;
}
