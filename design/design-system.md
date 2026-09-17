# Design System — Ashless (Quit Smoking App, India)

Status: **brand-applied**. `/brand` has delivered visual identity — the app's name is **Ashless** (renamed 2026-09-16 from the original "Jeb," see `docs/project/DECISIONS.md` — "ashless" names the outcome directly: no ash, no residue, nothing left over from the habit except what you kept). All hex values below are the real brand palette from `brand/visual-identity.md`, mapped 1:1 onto this document's original semantic token names, so nothing in `screen-specifications.md`, `digital-smoking-room.md`, `payment-flow.md`, or `quit-wallet.md` needed to change structurally — only the hex values and the brand name moved. The mark itself changed too: the old "Kept Pocket" symbol is retired in favor of the Ashless mark (a single stroke rising from ash-grey into gold — see `brand/logo-concepts.md`).

**Financial-model note (read before designing any money screen) — superseded, kept for history:** an earlier pass of this design set was built against `docs/architecture/payment-architecture.md`'s now-retired platform-revenue model. That conflict is **resolved**: `docs/product/PRD.md` v1.1 is the canonical, governing document (see its own banner), and the money model is now a concrete **two-leg collect-then-payout mechanism** (PRD §L) — the user's payment is collected by a licensed Payment Aggregator and immediately paid out again to the user's own Savings Destination account, automatically, as one user-initiated action. Quit Wallet is genuinely the user's own money in their own account. There is no voucher/donation redemption system — see `payment-flow.md`'s resolution note for the full history if it matters to a future reader.

---

## 1. Design Principles

1. **Never a marketplace.** No product catalog, no browsing, no brand logos, no "buy" language anywhere in the app. The Digital Smoking Room only ever shows *the user's own saved profile*, never a menu of choices.
2. **Three emotional zones, three colors.** Every screen in the craving→redirect→reward arc sits visually in one of three states: **Tension** (craving is real), **Decision** (the redirect moment), **Reward** (money saved, reinforced). Color, not copy, should tell the user which zone they're in.
3. **Money is the hero, not tobacco.** No photoreal cigarette/pack imagery anywhere in the product. Abstract, schematic iconography only — see §7.
4. **Judgment-free, always.** Relapse and payment-failure states use the same calm visual register as success states. Never red-alert-shame the user for smoking or for a failed transaction.
5. **One-thumb operable.** Primary CTAs live in the bottom 40% of the screen (thumb zone) — this matters most at 2am cravings.
6. **Say what's literally true: it's your money, in your account.** Per PRD Immutable Rule 6 and §L, every save genuinely lands in the user's own Savings Destination via the automatic collect-then-payout mechanism — so "your savings," "your account," "your money" are all accurate and should be used plainly, not hedged. The one thing to never imply is that Ashless *holds* or *stores* the money at any point beyond the brief, automatic collect→payout gap — that's the actual compliance line (PRD §L.0), not a ban on possessive language.
7. **"I WANT TO SMOKE" is sacred.** Per PRD Immutable Rule 4, this exact phrase — stated plainly, unsoftened, all-caps as written — is the primary Home CTA and appears nowhere else in the app as a label for anything else. Naming the urge honestly is the point; don't let a later design pass quietly soften it back to "I'm craving" or similar.

---

## 2. Color Tokens

### 2.1 Neutrals
| Token | Hex | Use |
|---|---|---|
| `ink.900` | `#1F1B16` | Primary text, logo strokes, icons |
| `ink.600` | `#4B5563` | Secondary text |
| `ink.300` | `#9CA3AF` | Placeholder / disabled text |
| `surface.0` | `#FFF9F0` | Cards, sheets — one shade lighter than the page, never stark white |
| `surface.50` | `#FAF3E7` | App background — warm cream |
| `surface.100` | `#EEF1F2` | Card fill (nested), input fill |
| `line.200` | `#E2E5E8` | Borders, dividers |
| `overlay.scrim` | `rgba(31,27,22,0.55)` | Modal/sheet scrim |

### 2.2 Semantic — Emotional Zones
| Zone | Token | Hex | Meaning / where it appears |
|---|---|---|---|
| **Tension** | `craving.500` | `#E2703A` | Craving CTA, intervention screen, "urge" indicators |
| | `craving.100` | `#F7DCC9` | Tint backgrounds behind tension copy |
| **Decision** | `redirect.600` | `#1F6F63` | Digital Smoking Room primary actions, amount confirmation, payment initiation |
| | `redirect.100` | `#DCEBE8` | Tint backgrounds, selected states |
| **Reward** | `reward.600` | `#2E8B57` | Payment success, wallet balance, streak, milestones |
| | `reward.100` | `#E1F3E8` | Tint backgrounds, success banners |
| **Milestone accent** | `gold.500` | `#E7B23D` | Badges, streak milestones only — never a primary action color |

### 2.3 Functional
| Token | Hex | Use |
|---|---|---|
| `alert.600` | `#D0342C` | Payment failure, destructive confirm (never used to shame relapse) — kept as the system default, unchanged by brand |
| `alert.100` | `#FBE3E1` | Error tint backgrounds |
| `info.600` | `#3467D6` | Informational banners, tooltips |
| `focus.ring` | `#1F6F63` at 40% opacity, 3px | Keyboard/accessibility focus outline |

**Contrast rule:** all text-on-tint and text-on-fill pairs must meet WCAG AA (4.5:1 body, 3:1 large text ≥24sp/bold ≥19sp) — verified against the warm-cream backgrounds above, not just against white.

**Explicitly avoided per brand direction:** clinical blue/white (hospital/govt-portal register), pastel lavender/mint (generic meditation-app register), pure warning-red as a primary color (cigarette-pack/warning-label association). The palette is deliberately pulled warmer/earthier than a generic dashboard status-color system — terracotta amber, deep teal, forest green — so Ashless reads as a considered fintech-adjacent brand (closer to Jupiter/CRED-style restraint) rather than a health app.

---

## 3. Typography

**In-product UI (screens, buttons, body copy):** system-first for an India Android app — **Roboto** (Android default), paired with **Noto Sans Devanagari** (or the relevant regional script) so mixed English/regional-language strings render consistently. Do not ship a Latin-only display font as the sole face — many target users will have device language set to Hindi/regional scripts. Brand confirms this choice deliberately over a licensed custom UI face: legibility and load-time performance matter more than personality in dense in-product UI.

**Brand-only surfaces** (logo wordmark, splash screen, app-store listing, marketing/launch assets — never dense in-product UI): a warmer rounded geometric sans, direction **Poppins (rounded weights), General Sans, or Cabinet Grotesk**. This is where Ashless's distinct voice shows up visually; it never leaks into screens where Roboto needs to carry the load.

**Numerals:** always render currency and counters (₹ amounts, streak days, sticks avoided) with **tabular figures** (`font-feature-settings: 'tnum'`) so digits don't jitter during count-up animations.

### Type scale
| Style | Size/Line (sp) | Weight | Use |
|---|---|---|---|
| Display L | 34/40 | Bold (700) | Wallet total, payment-success amount |
| Display M | 28/36 | Bold (700) | Streak day count |
| H1 | 24/32 | SemiBold (600) | Screen titles |
| H2 | 20/28 | SemiBold (600) | Section headers |
| Body L | 16/24 | Regular (400) | Primary body, list items |
| Body L Emphasis | 16/24 | SemiBold (600) | Button labels, key values |
| Body M | 14/20 | Regular (400) | Secondary text, helper text |
| Caption | 12/16 | Regular (400) | Metadata, timestamps, field labels |
| Overline | 11/16 | SemiBold (600), +0.5 tracking, uppercase | Eyebrow labels ("QUIT WALLET") |

Minimum body text size: 14sp. Never go below 12sp for any user-facing copy (accessibility floor).

---

## 4. Spacing & Layout

**Grid base:** 4dp. Scale: 4, 8, 12, 16, 24, 32, 40, 48, 64.

- Screen horizontal margin: **16dp** (phone), 24dp (large/tablet)
- Card internal padding: **16dp**
- Section-to-section gap: **24dp**
- Related-item gap (within a card/list): **8–12dp**
- Minimum touch target: **48×48dp** (Android accessibility minimum); primary CTAs use 56dp height.

**Radii**
| Token | px | Use |
|---|---|---|
| `radius.sm` | 8 | Chips, inputs, small tags |
| `radius.md` | 12 | Cards |
| `radius.lg` | 20 | Bottom sheets, modals (top corners) |
| `radius.pill` | 999 | Buttons, badges, segmented controls |

**Elevation**
| Token | Shadow | Use |
|---|---|---|
| `el.0` | none, flat | Resting page background |
| `el.1` | 0 1 2 rgba(18,24,27,.06) | Resting cards |
| `el.2` | 0 4 12 rgba(18,24,27,.10) | Raised/active cards, FAB |
| `el.3` | 0 12 32 rgba(18,24,27,.16) | Bottom sheets, modals |

---

## 5. Buttons

| Variant | Fill | Text | Use |
|---|---|---|---|
| Primary / Redirect | `redirect.600` | white | Default forward action (Continue, Next, Confirm) — e.g. **"SAVE ₹[amount]"** on Amount Confirmation (SCR-16) |
| Primary / Craving | `craving.500` | white | Only the **"I WANT TO SMOKE"** entry CTA (SCR-09) — never used elsewhere, so its appearance stays a meaningful signal |
| Primary / Reward | `reward.600` | white | Success-state confirmations, e.g. "Done" on Payment Success (SCR-19) |
| Secondary / Outline | transparent, 1.5px `line.200` border | `ink.900` | Secondary actions (Skip, Not now) |
| Ghost / Text | transparent | `redirect.600` | Tertiary/link-style actions |
| Destructive / Outline | transparent, 1.5px `alert.600` border | `alert.600` | Cancel payment, delete goal — never for relapse logging (that uses neutral, not destructive, styling) |

**Sizes:** L = 56dp height (primary CTA, full-width, thumb zone), M = 48dp (secondary/inline), S = 40dp (chip-like actions inside cards).

**States:** default / pressed (–8% luminance) / disabled (40% opacity, no shadow, non-interactive) / loading (label replaced by 20dp spinner, width locked to prevent layout shift).

**Button copy, per brand:** tie labels to the money mechanic rather than generic UI verbs where it reads naturally — *"Keep it," "Log this urge," "See my savings"* — over plain *"Continue."* Screen specs in this doc set already follow this instinct (e.g., "Redirect ₹40 to Quit Wallet" rather than "Confirm"); treat that as the house style going forward, not an exception.

**Uppercase emphasis is reserved, not a general style.** Two labels in the whole product are written in full uppercase — **"I WANT TO SMOKE"** (the Home CTA) and **"SAVE ₹[amount]"** (the Amount Confirmation CTA) — because they're the two ends of the core loop's single most important decision and deliberately share that visual weight. No other button, anywhere, should be set in uppercase; doing so elsewhere would dilute the one signal these two labels are meant to carry.

---

## 6. Core Components

**Stat card** — icon/label top, Display-scale value, optional delta caption below (e.g., "+₹40 today"). `el.1`, `radius.md`.

**Goal card** — goal name, linear progress bar (`redirect.600` fill on `surface.100` track), "₹X of ₹Y" caption, target-date chip.

**Transaction/ledger row** — left: icon (redirect-in vs relapse-marker) + label + timestamp; right: signed amount (tabular nums), `reward.600` for credits. Divider `line.200` between rows, no card chrome (dense list).

**Milestone/badge card** — `gold.500` accent border-left 3dp, icon, title, date earned. Locked state: full desaturation, lock icon, no color accent.

**Streak ring** — circular progress (track `surface.100`, fill `reward.600`), center = Display M day count + "smoke-free" caption. Animates on increment, never animates backward-jarringly on reset (see Relapse flow, crossfades to new state instead of visibly "unwinding").

**Payment state component** (see `payment-flow.md` for full spec) — single component with three visual states (pending/success/failure) sharing layout so the screen doesn't jump between them.

**Brand row** (new — introduced for SCR-14's expanded Brand Selection, see `digital-smoking-room.md`) — a plain, text-first selectable list row: label (left, Body L Emphasis) + own cost-per-stick (right, Body M, tabular nums) + optional small edit-pencil affordance. No logo/photo slot exists in this component at all — not "hidden," structurally absent, so it can't be added back by accident in a later pass. Two size variants: **hero** (the prominent usual-brand card, larger padding, `el.2`, used exactly once per screen) and **standard** (saved-brand and search-result rows, `el.0`, dense list, no card chrome — same list treatment as the Transaction row above, for visual consistency between "your saved brands" and "your savings history" as two instances of the same underlying list pattern).

**Live cost calculator** (new — the price ÷ pack-size readout in SCR-14's price & pack-size sheet) — a single Body L Emphasis line, tabular nums, updating on every keystroke with no separate "Calculate" action. This is a specific instance of the general Numerals rule in `design-system.md` §3, called out here because it's the first place in the product where a *computed* (not just displayed) number updates live in response to two different input fields at once — treat any future price/quantity-derived live calculation the same way (immediate, no calculate button, tabular nums, live-region announced for accessibility).

---

## 7. Iconography

- Style: **outline, rounded-cap, 2px stroke, 24dp grid** — consistent with Material Symbols Rounded.
- **No photoreal or brand-identifiable tobacco imagery anywhere** — this is a hard constraint (Play Store health-app policy risk, glamorization risk, and it's the mechanism that keeps the product a *reflection tool*, not a catalog). The Digital Smoking Room uses one abstract glyph: a schematic cigarette silhouette dissolving into a ₹ coin — used exactly once, at the top of the Digital Smoking Room screen, never as a repeated decorative motif.
- **Applies with extra force to SCR-14's brand search and results list** — a searchable, scrollable list of brand names is structurally the closest this product ever comes to looking like a shopping/browse surface, so it gets zero decoration: no per-brand icon, no logo mark, no color-coding by brand, plain text only (see the **Brand row** component, §6). If a future pass is tempted to "make the search results feel richer," that instinct should be resisted here specifically, not just noted as a general principle.
- Craving-zone icons: flame/spark motifs (urge, heat).
- Decision-zone icons: arrow-redirect, split-path motifs.
- Reward-zone icons: coin, piggy bank/lock (wallet), checkmark-in-circle.

---

## 8. Forms

- Input height 56dp, label positioned above (not floating-only — floating labels underperform for low-literacy/first-time-smartphone users, a meaningful segment of this audience), helper/error text below at Caption size.
- Error state: `alert.600` 1.5px border + `alert.600` caption with icon, field does not shake/animate (keep it calm).
- OTP/login code input: 6 discrete 48×56dp boxes, auto-advance, large numerals.
- Currency input (price-per-pack in Smoking Profile Setup, SCR-29, and SCR-14's price & pack-size sheet): ₹ prefix fixed, numeric keypad only, tabular nums — one shared pattern across all three surfaces, not a variant per screen.
- Pack-size chip select (same three surfaces): chip row **10 / 20 / Custom**, `radius.pill`, selected state per standard chip treatment; "Custom" reveals a bare numeric field inline rather than opening a separate control.

---

## 9. Bottom Navigation

Fixed, **5 equal-weight tabs** (matches PRD §H exactly — no raised center FAB in this revision; an earlier version of this design set added one, but the PRD's actual nav is five plain tabs with the craving CTA living on Home itself, not in nav chrome, so that embellishment is retired), 64dp + safe-area inset, `surface.0` fill, `el.2` top shadow, active item shows `redirect.600` icon+label with a pill indicator behind the icon; inactive items `ink.300`.

`Home · Wallet · Progress · Coach · Profile`

Home carries the fast path into the craving flow via its own large **"I WANT TO SMOKE"** CTA (§1 Principle 7) — the nav bar itself stays uniform and doesn't need to encode urgency, since PRD §G's secondary "Open Smoking Room" action already gives a returning user a near-instant path from Home without a raised nav element competing for the same job.

---

## 10. Modals & Sheets

- **Bottom sheet** is the default modal pattern (matches the native UPI app-chooser pattern users already know from GPay/PhonePe) — used for: UPI app picker, quantity confirmation, goal creation, settings sub-panels. `radius.lg` top corners, `el.3`, drag handle, scrim `overlay.scrim`.
- **Full-screen takeover** — reserved for the Digital Smoking Room sequence only (screens 8–15). No bottom nav, no back-swipe-to-dismiss without confirmation once payment has started. This is deliberate: the moment needs total focus, the same way a native UPI payment screen commands full attention.
- Dismiss affordance: top-left "X" (not back-gesture-only) so exit is always an explicit, visible choice — never accidental during a vulnerable moment.

---

## 11. Motion

- Standard easing: `cubic-bezier(0.2, 0.0, 0, 1.0)`, 200–300ms for transitions, 150ms for micro-interactions (button press, toggle).
- Reward-zone count-up animations (₹ saved, streak days): 600–900ms ease-out, tabular nums prevent width jitter.
- Respect system "reduce motion" — all count-ups and confetti/celebration motion must have a static fallback (final value shown immediately, no burst effect) when the OS setting is on.

---

## 12. Accessibility Baseline (applies to every screen spec)

- Touch targets ≥48×48dp, spacing ≥8dp between adjacent targets.
- Text contrast ≥4.5:1 body / ≥3:1 large.
- All icons carry `contentDescription`; icon-only buttons never ship without one.
- TalkBack reading order follows visual hierarchy top→bottom, left→right; payment amount is announced as a single grouped element ("Amount, eighty rupees") not digit-by-digit.
- Dynamic type: layouts must not clip or truncate up to 130% system font scale.
- Never convey state by color alone (e.g., payment failure = icon + text + color, not color alone) — important given a meaningful share of target users may have partial color-vision differences and this is exactly the population most likely to be using the app one-handed in poor lighting.
- Language: every string must be wrapped for localization from day one (Hindi + at least one additional regional language at launch, per product brief) — no hardcoded English concatenation of amounts/counts (pluralization varies by language).
