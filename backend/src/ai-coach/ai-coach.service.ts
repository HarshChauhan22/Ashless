// Ported 1:1 from webapp/lib/ai-coach.ts — a deliberately simple, rule-based
// responder, NOT a call to a real LLM. Per the brief: "AI is a supporting
// layer, not the core financial engine," and wiring a real model needs an
// API key and explicit approval this project doesn't have yet. Crisis-
// escalation guardrail included since that's a safety requirement, not a
// nice-to-have. See DECISIONS.md D-012.
const CRISIS_KEYWORDS = ["kill myself", "suicide", "end my life", "hurt myself", "self harm", "self-harm", "want to die", "no reason to live"];

const CRISIS_RESPONSE =
  "I'm really glad you told me this, and I want to make sure you talk to someone who can actually help right now — I can't. Please reach out: iCall 9152987821, or KIRAN 1800-599-0019 (24x7, free). If you're in immediate danger, please contact a local emergency service.";

export const DISCLAIMER = "I'm an AI coach — here to support you, not to replace medical advice.";

export function isCrisisMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((k) => lower.includes(k));
}

export function respondTo(userMessage: string): string {
  if (isCrisisMessage(userMessage)) return CRISIS_RESPONSE;

  const lower = userMessage.toLowerCase();

  if (lower.includes("smoke") || lower.includes("craving") || lower.includes("urge") || lower.includes("cigarette")) {
    return "That urge is real, and it usually peaks and passes within a few minutes. Want to try 60 seconds of breathing, or would redirecting the money into your savings feel more honest to where you're at right now? Either is a real win.";
  }
  if (lower.includes("stress") || lower.includes("anxious") || lower.includes("anxiety")) {
    return "Stress cravings are some of the hardest — the urge isn't really about the cigarette, it's about needing a release valve. A minute of slow breathing does a lot of what the cigarette ritual was doing. Want to try it?";
  }
  if (lower.includes("better") || lower.includes("fine") || lower.includes("ok now") || lower.includes("okay now")) {
    return "That's genuinely worth noting — you rode it out. That's the whole game, one craving at a time.";
  }
  if (lower.includes("relapse") || lower.includes("smoked") || lower.includes("i smoked")) {
    return "Thanks for being honest about it — that matters more than it feeling like a setback. Want to log it? No judgment here, just keeping the record straight so tomorrow starts clean.";
  }

  return "I hear you. Tell me a bit more about what's going on right now, or if you'd rather skip straight to something concrete — breathing, redirecting the money, or logging a smoke — just say so.";
}

export function openingMessage(): string {
  return "Hey, I'm here. What's going on right now?";
}
