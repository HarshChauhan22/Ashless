import { db } from "./db";

// Event names match docs/product/analytics.md + the additions requested for
// this feature pass (craving_payment_redirect_completed, craving_handled,
// post_payment_timer_*, breathing_*, distraction_*). Server-emitted events
// are the ones that matter for financial/behavioral truth per
// system-architecture.md §10.1 — client-only taps are logged the same way
// here since there's no separate PostHog wired up in the prototype.
export function trackEvent(name: string, props: Record<string, unknown> = {}) {
  db.analyticsEvents.push({ name, props, at: new Date().toISOString() });
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${name}`, props);
}
