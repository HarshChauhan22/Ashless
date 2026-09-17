// In-memory "database" for the prototype, standing in for the Postgres schema
// documented in docs/architecture/database-schema.md. Table shapes mirror that
// doc's field names where practical; amounts are plain rupee numbers here
// (not paise/BigInt) for prototype simplicity — production must use
// integer-paise per database-schema.md §1.2.
//
// Persisted on `globalThis` so Next.js's dev-mode module reloading doesn't
// wipe state on every hot reload (a well-known Next.js dev quirk, not a
// production pattern — a real deploy would be a real Postgres instance).

export type PricingMode = "pack" | "single_stick";

export interface SmokingProfile {
  id: string;
  userId: string;
  brandLabel: string;
  pricingMode: PricingMode;
  packPricePaise: number | null; // rupees here, "Paise" kept in the name for schema-parity
  packSize: number | null;
  costPerStickPaise: number; // authoritative price — see database-schema.md §3.2
  isPrimary: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export type CravingOutcome =
  | "resisted"
  | "smoked"
  | "simulated_purchase" // = "craving redirected via payment" — see database-schema.md §3.4 note + DECISIONS.md
  | "abandoned"
  | "unresolved";

export interface CravingSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  outcome: CravingOutcome | null;
  copingAction: "ai_coach" | "breathing_exercise" | "quick_distraction" | "smoking_room" | "none" | null;
  linkedPaymentId: string | null;
  intensity: "mild" | "strong" | "overwhelming" | null; // captured at Craving Check-In (SCR-10)
  trigger: string | null; // e.g. 'stress' | 'social' | 'after_meal' | 'boredom' | 'alcohol' | 'other', optional
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmountPaise: number;
  status: "active" | "completed" | "abandoned";
  createdAt: string;
  completedAt: string | null;
}

export interface SavingsDestination {
  id: string;
  userId: string;
  label: string; // e.g. "UPI · you@okhdfcbank" — mock, never a real linked account
  isDefault: boolean;
  createdAt: string;
}

export interface AiMessage {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type PaymentStatus = "created" | "pending" | "succeeded" | "failed" | "cancelled";

export interface PaymentTransaction {
  id: string;
  userId: string;
  cravingSessionId: string;
  smokingProfileId: string;
  unitPricePaiseSnapshot: number;
  quantity: number;
  amountPaise: number; // = unitPricePaiseSnapshot * quantity, server-computed — never client-supplied
  status: PaymentStatus;
  idempotencyKey: string;
  providerOrderId: string;
  createdAt: string;
  verifiedAt: string | null;
}

export interface SavingsTransaction {
  id: string;
  userId: string;
  entryType: "credit" | "debit" | "reversal" | "adjustment";
  amountPaise: number; // positive for credit
  balanceAfterPaise: number;
  sourceType: "payment" | "admin_adjustment" | "refund_reversal";
  sourcePaymentId: string | null;
  description: string;
  createdAt: string;
}

export interface User {
  id: string;
  phoneNumber: string;
  createdAt: string;
}

interface Store {
  users: Map<string, User>;
  usersByPhone: Map<string, string>; // phone -> userId
  smokingProfiles: Map<string, SmokingProfile>;
  cravingSessions: Map<string, CravingSession>;
  paymentTransactions: Map<string, PaymentTransaction>;
  savingsTransactions: SavingsTransaction[];
  walletBalance: Map<string, number>; // userId -> balancePaise
  processedIdempotencyKeys: Set<string>; // "userId:key" — duplicate-payment defense
  analyticsEvents: { name: string; props: Record<string, unknown>; at: string }[];
  savingsGoals: Map<string, SavingsGoal>;
  savingsDestinations: Map<string, SavingsDestination>;
  aiMessages: Map<string, AiMessage[]>; // userId -> ordered messages (one flat "session" per user, kept simple for the demo)
}

declare global {
  // eslint-disable-next-line no-var
  var __ashlessStore: Store | undefined;
}

function createStore(): Store {
  return {
    users: new Map(),
    usersByPhone: new Map(),
    smokingProfiles: new Map(),
    cravingSessions: new Map(),
    paymentTransactions: new Map(),
    savingsTransactions: [],
    walletBalance: new Map(),
    processedIdempotencyKeys: new Set(),
    analyticsEvents: [],
    savingsGoals: new Map(),
    savingsDestinations: new Map(),
    aiMessages: new Map(),
  };
}

export const db: Store = globalThis.__ashlessStore ?? (globalThis.__ashlessStore = createStore());

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function getOrCreateUser(phoneNumber: string): User {
  const existingId = db.usersByPhone.get(phoneNumber);
  if (existingId) return db.users.get(existingId)!;
  const user: User = { id: newId("user"), phoneNumber, createdAt: new Date().toISOString() };
  db.users.set(user.id, user);
  db.usersByPhone.set(phoneNumber, user.id);
  db.walletBalance.set(user.id, 0);
  return user;
}

export function getWalletBalance(userId: string): number {
  return db.walletBalance.get(userId) ?? 0;
}

export function listSmokingProfiles(userId: string): SmokingProfile[] {
  return [...db.smokingProfiles.values()]
    .filter((p) => p.userId === userId)
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const at = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const bt = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      return bt - at;
    });
}

export function listSavingsTransactions(userId: string): SavingsTransaction[] {
  return db.savingsTransactions.filter((t) => t.userId === userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** Only an actual 'smoked' outcome resets the streak — see PRD Immutable Rules
 * and the 2026-09 CRITICAL STREAK RULE addendum: cravings, Digital Smoking
 * Room entry, redirected payments, breathing, and distraction never do. */
export function computeStreak(userId: string): { days: number; sinceIso: string } {
  const relapses = [...db.cravingSessions.values()]
    .filter((c) => c.userId === userId && c.outcome === "smoked")
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const since = relapses[0]?.startedAt ?? [...db.users.values()].find((u) => u.id === userId)?.createdAt ?? new Date().toISOString();
  const days = Math.floor((Date.now() - Date.parse(since)) / (1000 * 60 * 60 * 24));
  return { days, sinceIso: since };
}

export function countCigarettesAvoided(userId: string): number {
  return [...db.cravingSessions.values()].filter(
    (c) => c.userId === userId && (c.outcome === "resisted" || c.outcome === "simulated_purchase")
  ).length;
}

/** Breakdown for Progress/Cigarettes-Avoided-Detail (PRD SCR-26) — grouped by
 * the trigger tag captured at Craving Check-In, when present. */
export function avoidedByTrigger(userId: string): { trigger: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of db.cravingSessions.values()) {
    if (c.userId !== userId) continue;
    if (c.outcome !== "resisted" && c.outcome !== "simulated_purchase") continue;
    const key = c.trigger ?? "not specified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([trigger, count]) => ({ trigger, count })).sort((a, b) => b.count - a.count);
}

export function longestStreakDays(userId: string): number {
  const relapses = [...db.cravingSessions.values()]
    .filter((c) => c.userId === userId && c.outcome === "smoked")
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const user = db.users.get(userId);
  if (!user) return 0;
  const boundaries = [user.createdAt, ...relapses.map((r) => r.startedAt), new Date().toISOString()];
  let longest = 0;
  for (let i = 0; i < boundaries.length - 1; i++) {
    const days = Math.floor((Date.parse(boundaries[i + 1]) - Date.parse(boundaries[i])) / (1000 * 60 * 60 * 24));
    longest = Math.max(longest, days);
  }
  return longest;
}

export function listSavingsGoals(userId: string): SavingsGoal[] {
  return [...db.savingsGoals.values()]
    .filter((g) => g.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** Goals are a display label on the single underlying ledger, not fund
 * segregation (PRD §I / database-schema.md §3.8) — progress just watches
 * the same overall wallet balance, capped at the target. */
export function goalProgress(userId: string, goal: SavingsGoal): { progressPaise: number; percent: number } {
  const balance = getWalletBalance(userId);
  const progressPaise = Math.min(balance, goal.targetAmountPaise);
  const percent = Math.min(100, Math.round((progressPaise / goal.targetAmountPaise) * 100));
  return { progressPaise, percent };
}

/** Sum of ledger credits since the 1st of the current calendar month — the
 * Quit Wallet screen's "This month" stat. */
export function sumSavedThisMonth(userId: string): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return db.savingsTransactions
    .filter((t) => t.userId === userId && t.entryType === "credit" && Date.parse(t.createdAt) >= monthStart)
    .reduce((sum, t) => sum + t.amountPaise, 0);
}

/** Count of Digital Smoking Room redirects since the 1st of the current
 * calendar month — the Quit Wallet screen's "Cravings redirected" stat. */
export function countRedirectedThisMonth(userId: string): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return [...db.cravingSessions.values()].filter(
    (c) => c.userId === userId && c.outcome === "simulated_purchase" && Date.parse(c.startedAt) >= monthStart
  ).length;
}

export type WalletActivityItem =
  | { id: string; kind: "redirected"; amountPaise: number; createdAt: string }
  | { id: string; kind: "relapse"; createdAt: string };

/** Merges the savings ledger with logged relapses into the single feed the
 * Quit Wallet screen's "Recent activity" shows — the artifact interleaves
 * "Redirected craving" credits with a neutral "Logged a smoke · streak
 * reset" row, which live in two different tables in this data model. */
export function listWalletActivity(userId: string, limit = 10): WalletActivityItem[] {
  const credits: WalletActivityItem[] = db.savingsTransactions
    .filter((t) => t.userId === userId && t.entryType === "credit")
    .map((t) => ({ id: t.id, kind: "redirected" as const, amountPaise: t.amountPaise, createdAt: t.createdAt }));
  const relapses: WalletActivityItem[] = [...db.cravingSessions.values()]
    .filter((c) => c.userId === userId && c.outcome === "smoked")
    .map((c) => ({ id: c.id, kind: "relapse" as const, createdAt: c.startedAt }));
  return [...credits, ...relapses].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
}

export function listSavingsDestinations(userId: string): SavingsDestination[] {
  return [...db.savingsDestinations.values()].filter((d) => d.userId === userId).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function listAiMessages(userId: string): AiMessage[] {
  return db.aiMessages.get(userId) ?? [];
}

export function appendAiMessage(userId: string, message: AiMessage) {
  const existing = db.aiMessages.get(userId) ?? [];
  existing.push(message);
  db.aiMessages.set(userId, existing);
}
