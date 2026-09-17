import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getWalletBalance, listSavingsTransactions, listWalletActivity, sumSavedThisMonth, countRedirectedThisMonth } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const balancePaise = getWalletBalance(userId);
  const transactions = listSavingsTransactions(userId).slice(0, 10);
  const activity = listWalletActivity(userId);
  const thisMonthPaise = sumSavedThisMonth(userId);
  const redirectedThisMonth = countRedirectedThisMonth(userId);
  trackEvent("wallet_viewed", { userId, walletBalanceInr: balancePaise, isCached: false });

  return NextResponse.json({ data: { balancePaise, transactions, activity, thisMonthPaise, redirectedThisMonth } });
}
