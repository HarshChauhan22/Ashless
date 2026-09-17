// Fixed per-stick prices (₹) for the official 12-brand reference list
// (docs/architecture/database-schema.md §3.3 / DECISIONS.md D-008), used so
// picking a brand from the Digital Smoking Room's catalog auto-fills its
// price instead of asking the user to type one in — requested 2026-09-16,
// logged as DECISIONS.md D-013. Five of these (Gold Flake, Classic, Wills
// Navy Cut, Four Square, Advance) match the original design artifact's own
// BrandSelection mockup prices exactly; the rest are reasonable fill-ins
// for brands the artifact didn't show a price for.
export const BRAND_PRICES: Record<string, number> = {
  "Gold Flake": 18,
  Classic: 20,
  "Wills Navy Cut": 15,
  "Four Square": 12,
  "Red & White": 10,
  Scissors: 8,
  Bristol: 9,
  Cavanders: 14,
  Charminar: 6,
  Capstan: 11,
  Advance: 16,
  "Mond Variance": 13,
};
