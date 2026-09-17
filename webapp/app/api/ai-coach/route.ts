import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, newId, listAiMessages, appendAiMessage } from "@/lib/db";
import { respondTo, isCrisisMessage } from "@/lib/ai-coach";
import { trackEvent } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;
  return NextResponse.json({ data: listAiMessages(userId) });
}

export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  const { content, cravingSessionId } = body as { content?: string; cravingSessionId?: string };
  if (!content || !content.trim()) {
    return NextResponse.json({ error: { code: "content_required", message: "Message can't be empty." } }, { status: 400 });
  }

  const session = cravingSessionId ? db.cravingSessions.get(cravingSessionId) : undefined;

  appendAiMessage(userId, { id: newId("msg"), userId, role: "user", content: content.trim(), createdAt: new Date().toISOString() });
  trackEvent("ai_coach_message_sent", { userId, messageIndex: listAiMessages(userId).length });

  if (isCrisisMessage(content)) {
    trackEvent("ai_coach_escalation_triggered", { userId });
  }

  const replyText = respondTo(content, { intensity: session?.intensity ?? null, trigger: session?.trigger ?? null });
  const reply = { id: newId("msg"), userId, role: "assistant" as const, content: replyText, createdAt: new Date().toISOString() };
  appendAiMessage(userId, reply);

  return NextResponse.json({ data: reply }, { status: 201 });
}
