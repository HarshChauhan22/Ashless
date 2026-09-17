# API Architecture

Related: [system-architecture.md](./system-architecture.md) · [database-schema.md](./database-schema.md) · [payment-architecture.md](./payment-architecture.md) · [security.md](./security.md)

> **Revision note**: endpoints below are corrected to match `docs/product/PRD.md` §L (canonical) — the Digital Smoking Room catalog endpoint no longer prices anything (pricing comes from the user's own smoking profile), payments require a verified Savings Destination, and the redemption endpoints are removed (there is nothing to redeem — see payment-architecture.md §4.4).
>
> **Update note (brand/pricing configuration)**: §3.3 is extended for PRD SCR-05/user-flows.md §3.2's pack-mode vs. single-stick-mode price entry and the Brand Picker's search/recency behavior. No endpoint was added or removed — `POST`/`PATCH /smoking-profiles` gained request fields, and `GET /catalog/brands` gained an optional `q` search param.

---

## 1. Conventions

- **Style**: REST over HTTPS, JSON bodies. No GraphQL — a REST+NestJS setup is simpler for a coding agent to extend one endpoint at a time without a schema-stitching layer.
- **Base URL**: `https://api.<domain>.in/v1/...` — version in the path (`/v1`). Breaking changes ship as `/v2`; the mobile app pins a minimum supported API version and the backend rejects (`426 Upgrade Required`) calls from app versions below the minimum once `/v1` is sunset.
- **Auth header**: `Authorization: Bearer <access_token>` (JWT) on every endpoint except `POST /v1/auth/otp/request`, `POST /v1/auth/otp/verify`, `POST /v1/auth/refresh`, and `POST /v1/webhooks/*`.
- **Idempotency header**: `Idempotency-Key: <uuid>` — **required** on: `POST /v1/payments`, `POST /v1/savings-destinations`, `POST /v1/savings/goals`, and any other endpoint tagged `@Idempotent()`. Missing header on a required route → `400 idempotency_key_required`.
- **Content type**: `application/json; charset=utf-8` for all requests/responses.
- **Money fields**: always integers in paise, always serialized as **strings** in JSON (e.g., `"amount_paise": "150000"`) to avoid float/number precision issues on the client. Field names are always suffixed `_paise`.
- **Timestamps**: ISO-8601 UTC (`"2026-09-15T10:30:00Z"`).
- **Pagination**: cursor-based. Query params `?limit=20&cursor=<opaque>`. Response includes `"next_cursor": "..."` (`null` when no more pages). Limit default 20, max 100.
- **Rate limiting**: token-bucket per user (authenticated routes) and per IP (unauthenticated routes, e.g. OTP request). Response headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Exceeded → `429` with `Retry-After`.

---

## 2. Standard response envelope

**Success:**
```json
{
  "data": { ... },
  "meta": { "next_cursor": null }
}
```
`meta` omitted when not applicable (non-paginated endpoints).

**Error:**
```json
{
  "error": {
    "code": "payment_already_processed",
    "message": "This payment has already been completed.",
    "traceId": "a1b2c3d4-...",
    "details": {}
  }
}
```
`code` is a stable, machine-readable snake_case string the mobile app switches on for UX branching (never parse `message`, which is human-facing and may be localized). `details` carries field-level validation errors when relevant (e.g., `{"field": "quantity", "issue": "must be >= 1"}`).

### 2.1 Standard HTTP status usage

| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 202 | Accepted, processing async (e.g., payment still pending) |
| 400 | Validation error / malformed request |
| 401 | Missing/invalid/expired access token |
| 403 | Authenticated but not authorized for this resource |
| 404 | Resource not found (or not owned by caller — never leak existence of other users' resources) |
| 409 | Conflict — idempotency key reused with different payload, or state-machine violation (e.g., refunding a non-succeeded payment) |
| 422 | Semantically invalid (e.g., product inactive) |
| 429 | Rate limited |
| 500 | Unhandled server error (generic message + traceId only) |
| 502/503 | Upstream provider (payment/AI) unavailable |

---

## 3. Endpoints by domain

### 3.1 Auth (`/v1/auth`)

| Method & path | Purpose |
|---|---|
| `POST /auth/otp/request` | Body: `{ phone_number }`. Rate-limited per phone + per IP. Triggers Firebase Auth phone OTP (or SMS provider). No auth required. |
| `POST /auth/otp/verify` | Body: `{ firebase_id_token }` — the Firebase client SDK collects the OTP from the user and returns this token; the backend verifies it server-side via the Firebase Admin SDK (signature, issuer, expiry, `phone_number` claim — see security.md §2.1) rather than accepting a raw OTP code directly. Returns `{ access_token, refresh_token, user }`. Creates the `users` row on first verification (signup-and-login are the same call). |
| `POST /auth/google` | **Not in MVP** (decision 2026-09-16, see `docs/project/DECISIONS.md` and security.md §2.4) — documented here only as the V1 shape if Google Sign-In is added later: `{ id_token }`. Do not implement for MVP. |
| `POST /auth/refresh` | Body: `{ refresh_token }`. Returns new `{ access_token, refresh_token }` pair (rotation — old refresh token invalidated). No `Authorization` header needed (the refresh token itself is the credential). |
| `POST /auth/logout` | Revokes the current refresh token family for this device. |
| `DELETE /auth/logout-all` | Revokes all refresh tokens for the user (all devices) — used from "log out everywhere" / suspected compromise flows. |

### 3.2 Users (`/v1/users`)

| Method & path | Purpose |
|---|---|
| `GET /users/me` | Current user profile. |
| `PATCH /users/me` | Update `display_name`, `date_of_birth` (once, if not already age-verified), `locale`, `timezone`. |
| `POST /users/me/deletion-request` | Starts the 14-day account-deletion grace period (database-schema.md §7). |
| `POST /users/me/deletion-cancel` | Cancels a pending deletion within the grace period. |
| `GET /users/me/export` | Returns a downloadable JSON/PDF of the user's data (DPDP Act data-portability right) — profile, craving history, savings ledger, goals. |

### 3.3 Smoking profiles (`/v1/smoking-profiles`) — plural; a user may have more than one (PRD US-04)

| Method & path | Purpose |
|---|---|
| `GET /smoking-profiles` | List the current user's profiles, each with `last_used_at`. Client renders `is_primary` first, then the remainder ordered by `last_used_at DESC NULLS LAST` (database-schema.md §3.2 index) for SCR-14's "recently/previously used" section. |
| `POST /smoking-profiles` | Create a profile — `{ brand_label, pricing_mode: 'pack'|'single_stick', pack_price_paise?, pack_size?, cost_per_stick_paise?, cigarettes_per_day?, is_primary? }`. Exactly one of (`pack_price_paise`+`pack_size`) or `cost_per_stick_paise` is required, matching `pricing_mode` (database-schema.md §3.2 CHECK constraint) — mismatched combinations return `422 invalid_pricing_configuration`. Server computes and stores `cost_per_stick_paise` from the pack fields when `pricing_mode='pack'` (rounded to the nearest paise) and always returns the resolved value in the response, regardless of entry mode. Both `pack_price_paise` and `cost_per_stick_paise` are checked against configurable sanity bounds — `422 price_out_of_range` if exceeded (payment-architecture.md §5.7); this is a fat-finger safeguard, not a fraud check, since it's the user's own self-reported price. This is the endpoint called both from onboarding (SCR-05) and inline from the Digital Smoking Room's custom brand entry (SCR-14) — same contract, same validation, either caller. |
| `PATCH /smoking-profiles/{id}` | Update a profile — same body shape and validation as `POST`, partial. Editing price/pack size takes effect for future transactions only; every past `payment_transactions` row keeps its own `unit_price_paise_snapshot` (database-schema.md §3.5) and is never retroactively changed. Callable from Settings (SCR-29) **or** inline from the Digital Smoking Room (SCR-14), e.g. an "edit price" affordance on an already-selected profile — the endpoint doesn't distinguish the caller, and `POST /payments` always re-reads the current row at payment-creation time (payment-architecture.md §3.0), so an edit made moments before paying is picked up automatically. |
| `DELETE /smoking-profiles/{id}` | Delete a profile; blocked with `409` if it's the user's only profile and `is_primary`, unless another is promoted first. |
| `POST /smoking-profiles/{id}/set-primary` | Marks this profile as the "usual brand" — the one auto-selected/pre-highlighted in the Digital Smoking Room (SCR-14). |
| `GET /catalog/brands?q=<search>` | Read-only, searchable autocomplete list from `cigarette_brand_reference` (database-schema.md §3.3) for the Brand Picker's search field — **display names only, no price field**. `q` filters by prefix/substring match; omitted `q` returns the default sorted list. A search result not found here is exactly what routes the user to "I can't find my brand" → custom entry. |

### 3.4 Tracker (`/v1/craving-sessions`)

| Method & path | Purpose |
|---|---|
| `POST /craving-sessions` | Body: `{ client_session_id, started_at, intensity, trigger }`. Idempotent on `client_session_id`. |
| `PATCH /craving-sessions/{id}` | Update `ended_at`, `outcome`, `coping_action`, `notes`. |
| `GET /craving-sessions` | Paginated list, filters: `from`, `to`, `outcome`. |
| `GET /craving-sessions/stats` | Aggregate: current streak, longest streak, total resisted, cravings by trigger (for charts). |

### 3.5 Savings Destinations (`/v1/savings-destinations`) — the payout beneficiary, PRD §L.1/§L.2

| Method & path | Purpose |
|---|---|
| `POST /savings-destinations` | Body: `{ destination_type: 'vpa'|'bank_account', vpa?, bank_account_number?, bank_ifsc?, account_holder_name }`. Registers the destination as a beneficiary with the payout provider and triggers penny-drop/VPA verification (async — returns `verification_status: 'pending'`, resolved via webhook, see payment-architecture.md §2). Raw bank account number is passed through to the payout provider and never persisted server-side beyond a masked last-4 (database-schema.md §3.3a). |
| `GET /savings-destinations` | List the user's destinations with `verification_status`. |
| `PATCH /savings-destinations/{id}/set-default` | Marks a destination as `is_default` — pre-selected on SCR-16 if more than one exists. |
| `DELETE /savings-destinations/{id}` | Remove a destination; blocked with `409` if it's the only verified one and the user has no other (a payment cannot be created without a verified destination, PRD §L.1). |

### 3.6 Payments (`/v1/payments`) — see [payment-architecture.md](./payment-architecture.md) §3 for full sequence diagrams

| Method & path | Purpose |
|---|---|
| `POST /payments` **[Idempotent]** | Body: `{ savings_intent_id, smoking_profile_id, quantity, savings_destination_id }`. Server computes `amount_paise` from the referenced `smoking_profiles.cost_per_stick_paise` (never client-supplied), requires `savings_destination_id` to reference a `verified` destination (422 otherwise), creates a collection-leg provider order, creates `payment_transactions` row (`status='created'`). Returns `{ payment_id, provider, provider_order_id, amount_paise, currency, checkout_config }` — `checkout_config` is whatever the Razorpay Android SDK needs to open Checkout (key id, order id — **never** the secret key). |
| `POST /payments/{id}/verify` | Body: `{ provider_payment_id, provider_order_id, provider_signature }` — sent by the app immediately after the Razorpay SDK callback. Server independently re-verifies the signature and re-fetches status from the provider's server API before trusting anything; **does not trust the client's claim of success**, only uses the client call as a fast trigger to check the *actual* provider record. On success, also queues payout-leg initiation (payment-architecture.md §4.1a) — the response to this call does not wait on the payout leg. |
| `GET /payments/{id}` | Returns current `status` and `payout_status`. Used for polling when `verify` returns `pending` or when the app resumes after being backgrounded mid-checkout, and to surface payout detail in Savings History (SCR-23). |
| `GET /payments` | Paginated history. |
| `POST /payments/{id}/refund-request` | User-initiated refund request (e.g., mis-tap). Creates an internal review/refund flow — see payment-architecture.md §5.4 for auto- vs. manual-approval rules. (A payout-leg failure refund, §5.4a, is system-initiated and does not go through this endpoint.) |

### 3.7 Savings Ledger (`/v1/savings`) — see [payment-architecture.md](./payment-architecture.md) §4

| Method & path | Purpose |
|---|---|
| `GET /savings/balance` | `{ balance_paise, last_updated_at }` — reads `user_savings_balance`. Represents redirected savings already sent to the user's own account (Immutable Rule 6), not a platform-held balance. |
| `GET /savings/transactions` | Paginated ledger history, each row: `{ id, entry_type, amount_paise, balance_after_paise, source_type, payout_status, created_at }`. |
| `POST /savings/goals` **[Idempotent]** | Body: `{ title, target_amount_paise, target_date, icon }`. |
| `GET /savings/goals` | List goals with computed `progress_paise`, `progress_pct`. |
| `PATCH /savings/goals/{id}` | Update or abandon a goal. |

*(No redemption endpoints. There is nothing to redeem — every successful save already paid out to the user's own Savings Destination at transaction time; see payment-architecture.md §4.4.)*

### 3.8 AI Craving Coach (`/v1/ai-coach`)

| Method & path | Purpose |
|---|---|
| `POST /ai-coach/sessions` | Body: `{ craving_session_id? }`. Starts a session, returns `{ session_id }`. |
| `POST /ai-coach/sessions/{id}/messages` | Body: `{ content }`. Response streamed via `Content-Type: text/event-stream` (SSE) — chunks of assistant text, terminated by a final event containing `{ done: true, message_id, token_count }`. Rate-limited per user per day. |
| `GET /ai-coach/sessions/{id}` | Session detail + message history. |
| `POST /ai-coach/sessions/{id}/end` | Marks session ended. |

### 3.9 Notifications (`/v1/notifications`)

| Method & path | Purpose |
|---|---|
| `GET /notifications` | Paginated in-app notification center feed. |
| `PATCH /notifications/{id}/read` | Mark read. |
| `POST /notifications/read-all` | Mark all read. |
| `PUT /notifications/preferences` | Body: per-category opt-in/out + quiet hours. |
| `POST /devices` | Register/refresh an FCM token: `{ fcm_token, device_id }`. |
| `DELETE /devices/{device_id}` | Unregister (on logout). |

### 3.10 Analytics (`/v1/analytics`)

| Method & path | Purpose |
|---|---|
| `POST /analytics/events` | Body: `{ event_name, properties, session_id }` — **client-originated UX events only** (screen views, taps). Never used for financial events, which are always server-emitted internally (system-architecture.md §10). Batched client-side and flushed periodically to reduce request volume. |

### 3.11 Webhooks (`/v1/webhooks`) — no auth header, verified by provider signature instead

| Method & path | Purpose |
|---|---|
| `POST /webhooks/razorpay` | Razorpay **collection**-leg webhook ingress (`payment.captured`, etc). Verifies `X-Razorpay-Signature` against the raw body using the webhook secret before doing anything else. |
| `POST /webhooks/razorpayx-payouts` | RazorpayX **payout**-leg webhook ingress (`payout.processed`, `payout.failed`) — drives the payout state machine in payment-architecture.md §4.1a. Verified the same way, distinct secret. |
| `POST /webhooks/cashfree` | Reserved for the fallback/second provider (both legs). |

These routes must read the **raw request body** (not JSON-parsed by a global body-parser) to compute the HMAC signature correctly — configured as a raw-body route in NestJS, distinct from the rest of the app.

### 3.12 Admin (`/v1/admin`) — separate auth (admin JWT + IP allowlist), not reachable from the mobile app

| Method & path | Purpose |
|---|---|
| `POST /admin/catalog/brands` / `PATCH .../{id}` | Manage `cigarette_brand_reference` — display names for autocomplete only, no price field exists to manage. |
| `GET /admin/payments` | Search/filter all payment transactions, both legs (support tooling). |
| `POST /admin/payments/{id}/refund` | Manually trigger a collection-leg refund with an audit-logged reason. |
| `POST /admin/payments/{id}/retry-payout` | Manually re-trigger a stuck/failed payout leg (payment-architecture.md §5.4a), for support cases where the automatic retry budget was exhausted but the underlying destination issue has since been fixed by the user. |
| `POST /admin/users/{id}/balance-adjustment` | Manual ledger correction (e.g., goodwill credit); always inserts a `savings_transactions` row with `source_type='admin_adjustment'` and a mandatory `reason` — **never a raw balance edit**. |
| `GET /admin/reconciliation/report` | Latest reconciliation job output (both legs). |

---

## 4. Example: `POST /v1/payments` request/response

**Request**
```
POST /v1/payments
Authorization: Bearer eyJ...
Idempotency-Key: 8f14e45f-ceea-4d9c-b3e9-000000000001
Content-Type: application/json

{
  "savings_intent_id": "8f14e45f-ceea-4d9c-b3e9-000000000001",
  "smoking_profile_id": "b7e6c0a2-....",
  "quantity": 1,
  "savings_destination_id": "d4a1f9e0-...."
}
```

Note `amount_paise` is not sent — it is derived entirely server-side from `smoking_profile_id` (the user's own price) + `quantity`; the request body has no price field to tamper with. `savings_intent_id` is also the idempotency key for the downstream payout leg (payment-architecture.md §3.1), not just this collection request.

**Response `201`**
```json
{
  "data": {
    "payment_id": "3f2c1a90-....",
    "status": "created",
    "payout_status": null,
    "provider": "razorpay",
    "provider_order_id": "order_NcX....",
    "amount_paise": "1500",
    "currency": "INR",
    "checkout_config": {
      "key_id": "rzp_live_xxxx",
      "order_id": "order_NcX....",
      "name": "Ashless",
      "description": "Save instead — 1x cigarette avoided"
    }
  }
}
```

`payout_status` is `null` until the collection leg succeeds, then transitions to `initiated` → `completed`/`failed` (payment-architecture.md §4.1a); poll `GET /payments/{id}` or watch for a notification if it resolves to `failed`.

---

## 5. Versioning & deprecation policy

- Additive changes (new optional field, new endpoint) ship without a version bump.
- Breaking changes (removed/renamed field, changed semantics) require `/v2` alongside `/v1`, with `/v1` kept alive for at least one Play Store forced-update cycle (recommend 90 days minimum) before removal, enforced via the app's minimum-supported-version check at startup (`GET /v1/config` returns `min_supported_app_version`).
