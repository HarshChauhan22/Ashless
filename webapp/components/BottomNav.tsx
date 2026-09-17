"use client";

import { usePathname, useRouter } from "next/navigation";

// Matches the original Claude Design canvas artifact exactly (DECISIONS.md
// D-011): four flat tabs plus a raised center FAB for the craving flow —
// not five equal tabs. Coach is deliberately absent from the bar; it's
// reached contextually (Relapse Flow's "Talk to AI Coach about this",
// Profile's Help & Support section), matching what the artifact shows.
const TABS = [
  {
    href: "/home",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#63C7B8" : "#5F6368"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Track",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#63C7B8" : "#5F6368"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-6 3 3 5-8" />
      </svg>
    ),
  },
] as const;

const TABS_RIGHT = [
  {
    href: "/wallet",
    label: "Wallet",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#63C7B8" : "#5F6368"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <circle cx="18" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#63C7B8" : "#5F6368"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + "/");
  }

  async function openCravingHub() {
    const { apiFetch } = await import("@/lib/api-client");
    const res = await apiFetch<{ id: string }>("/api/craving-sessions", { method: "POST", body: { entryPoint: "bottom_nav_fab" } });
    if (res.ok) router.push(`/craving?cravingSessionId=${res.data.id}`);
  }

  return (
    <nav className="sticky bottom-0 left-0 right-0 flex items-end justify-around border-t border-line-200 bg-surface-0 pb-[calc(10px+env(safe-area-inset-bottom))] pt-1.5">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <button key={tab.href} onClick={() => router.push(tab.href)} className="flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium">
            {tab.icon(active)}
            <span className={active ? "font-semibold text-redirect-600" : "text-ink-300"}>{tab.label}</span>
          </button>
        );
      })}

      <button onClick={openCravingHub} className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-craving-500 shadow-[0_4px_12px_rgba(240,131,79,0.35)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      </button>

      {TABS_RIGHT.map((tab) => {
        const active = isActive(tab.href);
        return (
          <button key={tab.href} onClick={() => router.push(tab.href)} className="flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium">
            {tab.icon(active)}
            <span className={active ? "font-semibold text-redirect-600" : "text-ink-300"}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
