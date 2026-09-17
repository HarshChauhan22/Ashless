# Visual Identity — Ashless

**Handoff note:** `/design/design-system.md` already exists and is explicitly a "placeholder token set, brand-ready" — it names semantic tokens (`craving.500`, `redirect.600`, `reward.600`, `gold.500`, `ink.900`, `surface.0`, etc.) and three emotional zones (**Tension / Decision / Reward**) and is waiting for real brand values to be substituted in without touching any screen spec. This doc's color and type choices are written as a direct substitution into that existing contract, not a competing palette — implementers should treat the table below as the real values for those token names.

## Color

**Primary direction: warmth cooling into calm.** The existing design system's three-zone model (Tension → Decision → Reward) already encodes the exact emotional arc the brief describes — craving heat resolving into calm, money-backed relief — so the brand palette maps onto it directly instead of inventing a parallel structure.

| Design-system token | Brand hex | Zone / use |
|---|---|---|
| `ink.900` | `#1F1B16` | primary text, logo strokes, icons |
| `surface.50` (app background) | `#FAF3E7` | warm cream, never stark white |
| `surface.0` (card fill) | `#FFF9F0` | cards sit one shade lighter than the page |
| `craving.500` (Tension) | `#E2703A` | craving CTA, intervention screen, urge indicators |
| `craving.100` | `#F7DCC9` | tint backgrounds behind tension copy |
| `redirect.600` (Decision) | `#1F6F63` | Digital Smoking Room primary actions, amount confirmation |
| `redirect.100` | `#DCEBE8` | tint backgrounds, selected states |
| `reward.600` (Reward) | `#2E8B57` | payment success, wallet balance, streak, milestones |
| `reward.100` | `#E1F3E8` | tint backgrounds, success banners |
| `gold.500` (milestone accent) | `#E7B23D` | badges, streak milestones only — never a primary action color |
| `alert.600` | `#D0342C` (system default, unchanged) | payment failure only — never used to shame relapse |

Reasoning for the hue shifts from the placeholder set: pulled the whole palette a few degrees warmer/earthier (terracotta amber instead of pure orange-red, a deeper teal, a forest-leaning green) so it reads as a considered brand rather than a generic status-color system borrowed from a dashboard. Craving and Reward stay clearly distinct hues (amber vs. green) so the zone system the design doc depends on keeps working at a glance, even for the color-vision-difference cases the accessibility section already calls out.

Explicitly avoided across the whole palette: clinical blue/white (hospital, govt portal), pastel lavender/mint (generic meditation-app register), a pure warning-red as any kind of primary color (cigarette-pack/warning-label association).

## Typography

Follows the design system's existing decision (system-first, Roboto baseline, Noto Sans Devanagari pairing for mixed-language UI) rather than replacing it — that decision is correct for an India Android-first product and shouldn't be relitigated for the sake of brand flair.

- **In-product UI (screens, buttons, body copy):** stays Roboto (or the shipped Android system font), paired with Noto Sans Devanagari — unchanged from the design system. Numerals keep tabular-figure rendering for count-ups, as already specified.
- **Brand-only surfaces (logo wordmark, splash screen, app-store listing, marketing/launch assets):** a warmer rounded geometric sans — direction: Poppins (rounded weights), General Sans, or Cabinet Grotesk. This is where the brand gets its distinct voice; it never leaks into dense in-product UI where Roboto's legibility and load-time performance matter more than personality.

## Icon style

Confirms and adopts the design system's existing icon spec: outline, rounded-cap, 2px stroke, 24dp grid (Material Symbols Rounded–compatible). No filled icons, no gradients inside icons — gradients stay reserved for backgrounds and hero moments so they read as special. Icon subject matter stays behavioral/emotional (wallet, clock, rising line, checkmark, hand) — never medical.

The design system already carves out one deliberate, tightly-scoped exception: a schematic cigarette silhouette dissolving into a ₹ coin, used exactly once at the top of the Digital Smoking Room screen. That exception stands — it's the one moment in the product where naming the object directly earns its keep. The **brand mark itself** (logo, app icon) stays free of any cigarette silhouette, per the brief — that restraint applies to the identity system, not to this one sanctioned in-product moment.

## Illustration style

Abstract, not literal. Soft gradient orbs and simple geometric forms stand in for emotional states — an amber orb "cooling" into green across a savings milestone, small gold dots animating into a wallet on a win. No illustrated people smoking, no before/after health diagrams, no lungs.

## Buttons

Adopts the design system's existing button spec (pill/`radius.pill`, L=56dp/M=48dp/S=40dp, the Primary-Redirect / Primary-Craving / Primary-Reward / Secondary-Outline / Ghost / Destructive-Outline variants) filled with the brand hexes above in place of the placeholder ones. Button copy stays tied to the money mechanic ("Keep it," "Log this urge," "See my savings") rather than generic "Continue" labels.

## Cards

Adopts the existing `radius.md` (12px) and elevation tokens as-is — these are layout/engineering decisions, not brand ones. Brand's contribution is warmth of fill (`surface.0` at `#FFF9F0` on `surface.50` cream, rather than white-on-grey) so elevation reads through warmth/contrast. Milestone cards are the one place that gets a full gradient treatment (`craving.500` → `reward.600`), so they stand out as celebration moments rather than routine UI.

## Background

Base stays the warm cream (`surface.50` = `#FAF3E7`), never stark white or clinical grey. Emotional-peak screens (mid-craving, post-win) can take a full-bleed gradient wash using the zone colors above — the background itself reinforces which of the three zones (Tension/Decision/Reward) the user is currently in, same principle the design system already states in its own Principle #2.

## App icon direction

**Revision 2026-09-16**: updated for the Ashless rename (`docs/project/DECISIONS.md`) — the app icon no longer carries the retired "Kept Pocket" symbol or the craving→reward gradient. It's now a warm-charcoal-to-gold diagonal gradient (an "ash resolving into value" story, distinct from any in-product UI color) carrying the Ashless rising-stroke symbol reversed to cream, sized inside Android's adaptive-icon safe zone (~66% of full bounds) so the stroke's ends survive circular/squircle masking. See `logo-concepts.md` and `assets/ashless-app-icon.svg`.

## Overall bar

The identity should read closer to a modern fintech/savings app (Jupiter, CRED-adjacent restraint, Monzo-style warmth) than to a health app — because emotionally, that's what the product is: a savings and behavior product triggered by a craving, not a medical intervention that happens to involve money.
