# Database Architecture & Schema

Database: **PostgreSQL 16**, accessed via **Prisma 5.x**. All DDL below is written as plain SQL for clarity and portability; the actual source of truth in the repo will be `prisma/schema.prisma`, and Prisma migrations must be generated from it (never hand-edit the DB in prod).

Related: [system-architecture.md](./system-architecture.md) · [payment-architecture.md](./payment-architecture.md) (deep dive on ledger integrity) · [security.md](./security.md) (encryption/PII columns)

> **Revision note**: this schema has been corrected to match `docs/product/PRD.md` §L (canonical). Two fixes from the previous revision: (1) `payment_transactions.amount_paise` is now derived from the user's own `smoking_profiles` price, never from an admin-managed catalog; (2) `smoking_profiles` now supports multiple profiles per user, matching PRD `mvp-scope.md` US-04. A new `savings_destinations` table and payout-tracking columns support the two-leg collect-then-payout money flow (`payment-architecture.md` §1).
>
> **Update note (brand/pricing configuration)**: `smoking_profiles` (§3.2) is extended to model PRD SCR-05/US-03/US-04 precisely: explicit **pack-mode vs. single-stick-mode** price entry (`pricing_mode`, `pack_price_paise`, `pack_size`), with `cost_per_stick_paise` now documented as always server-calculated in pack mode (never a bare directly-entered field in that mode), plus `last_used_at` to drive SCR-14's "recently/previously used" brand ordering. Brand identity stays a single free-text `brand_label` column (a catalog-picked or custom name, denormalized at selection time) — no separate catalog/custom flag or FK was needed to satisfy the requirement, since `cigarette_brand_reference` (§3.3) was already names-only and never joined for pricing. This is additive: no existing column is removed, `payment_transactions` is unchanged, and every payment still reads the same single `cost_per_stick_paise` field it always did (payment-architecture.md §3.1).

---

## 1. Design principles

1. **Money is append-only.** `payment_transactions` rows are updated only through a strict state machine (never deleted); `savings_transactions` rows are **never updated or deleted** after insert — corrections are new rows.
2. **Every amount is an integer in the smallest currency unit** (paise, not rupees) — `BIGINT`, never `FLOAT`/`DOUBLE`, to avoid rounding errors.
3. **Every external identifier is unique-constrained.** Provider order IDs, payment IDs, and webhook event IDs all have DB-level unique constraints — this is the actual duplicate-prevention mechanism, not just application logic.
4. **Foreign keys enforce referential integrity**; soft-delete (`deleted_at`) is used for `users` (see §7, account deletion) rather than hard cascading deletes on financial history.
5. **Every table has `id UUID`, `created_at`, `updated_at`** unless noted. UUIDs (v4, generated at insert time via `gen_random_uuid()` or app-side) avoid leaking sequential IDs (enumeration attacks) for a financial app.
6. **Timestamps are `TIMESTAMPTZ`**, stored UTC; display conversion to IST happens client-side.

---

## 2. Entity relationship overview

```
users 1───N smoking_profiles (multiple brands supported — PRD US-04)
users 1───N savings_destinations (payout beneficiaries — PRD §L.1)
users 1───N craving_sessions
users 1───N payment_transactions ───1 smoking_profiles (price source, snapshotted)
                                  ───1 savings_destinations (payout target)
users 1───N savings_transactions (immutable ledger, may reference a payment_transaction)
users 1───N savings_goals
users 1───N ai_sessions 1───N ai_session_messages
users 1───N notifications
users 1───N analytics_events
users 1───N device_tokens
users 1───N refresh_tokens
users 1───1 user_savings_balance (materialized cache, derived from savings_transactions)
payment_transactions 1───N webhook_events (raw provider callbacks received for that payment, both collection and payout legs)
payment_transactions 1───1 idempotency_keys (the key that created it)
cigarette_brand_reference (optional, admin-managed autocomplete list only — never a pricing source, see §3.3)
```

---

## 3. Core tables

### 3.1 `users`

```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number        VARCHAR(15) NOT NULL,        -- E.164, e.g. +91XXXXXXXXXX
  phone_verified_at   TIMESTAMPTZ,
  email               CITEXT,                       -- optional, nullable
  email_verified_at   TIMESTAMPTZ,
  display_name        VARCHAR(100),
  date_of_birth       DATE,                          -- for age-gating (tobacco-cessation apps must verify 18+)
  auth_provider       VARCHAR(20) NOT NULL DEFAULT 'phone_otp', -- phone_otp | google
  status              VARCHAR(20) NOT NULL DEFAULT 'active',    -- active | suspended | deletion_pending | deleted
  risk_score          SMALLINT NOT NULL DEFAULT 0,   -- 0-100, updated by fraud engine
  timezone            VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  locale              VARCHAR(10) NOT NULL DEFAULT 'en-IN',
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT users_phone_unique UNIQUE (phone_number),
  CONSTRAINT users_email_unique UNIQUE (email)
);
CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;
```

- `status = deletion_pending` supports the account-deletion grace period (§7).
- No plaintext sensitive data beyond phone number is stored here; anything more sensitive (payment instrument details) never touches our DB at all (tokenized by the PA, see payment-architecture.md).

### 3.2 `smoking_profiles`

```sql
CREATE TABLE smoking_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_label           VARCHAR(100) NOT NULL,        -- user's own name for this profile, e.g. "Gold Flake", "Classic Milds" — free text, may reference cigarette_brand_reference.display_name for autocomplete but is stored independently; a custom (not-in-reference-list) entry is NEVER written back to cigarette_brand_reference
  pricing_mode          VARCHAR(20) NOT NULL DEFAULT 'pack', -- 'pack' | 'single_stick' — which entry mode SCR-05/SCR-14 used, kept so the edit screen (SCR-29) reopens the same mode the user originally used
  pack_price_paise      BIGINT CHECK (pack_price_paise > 0),  -- set when pricing_mode='pack'; NULL when pricing_mode='single_stick'
  pack_size             SMALLINT CHECK (pack_size > 0),        -- set when pricing_mode='pack' (e.g. 10 or 20); NULL when pricing_mode='single_stick'
  cost_per_stick_paise  BIGINT NOT NULL CHECK (cost_per_stick_paise > 0), -- AUTHORITATIVE price used to compute every Digital Smoking Room amount — either ROUND(pack_price_paise / pack_size) computed at write time (pack mode) or entered directly (single_stick mode); never admin/catalog-sourced — see payment-architecture.md §3.1 and PRD §L.1/§L.3, Immutable Rule 3
  cigarettes_per_day    SMALLINT CHECK (cigarettes_per_day >= 0),
  is_primary            BOOLEAN NOT NULL DEFAULT false, -- the "usual brand," pre-selected/auto-advanced in SCR-14 when a user has multiple; exactly one profile per user should be true (enforced in application logic, not a DB constraint, to keep "set new primary" a simple two-write operation)
  last_used_at          TIMESTAMPTZ,                    -- updated whenever this profile is selected in a successful Digital Smoking Room transaction (payment-architecture.md §3.3); drives SCR-14's "recently/previously used" ordering. NULL for a never-used profile.
  years_smoking         SMALLINT,
  quit_date             DATE,                     -- NULL if still in "reduction" mode, set once user commits
  primary_triggers      TEXT[],                   -- e.g. {'stress','after_meal','social'}
  motivation_note       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT smoking_profiles_pricing_mode_fields CHECK (
    (pricing_mode = 'pack' AND pack_price_paise IS NOT NULL AND pack_size IS NOT NULL) OR
    (pricing_mode = 'single_stick' AND pack_price_paise IS NULL AND pack_size IS NULL)
  )

  -- NOTE: no UNIQUE(user_id) here. A user may have multiple smoking_profiles (PRD mvp-scope.md US-04 —
  -- single-stick, multi-brand purchasing is core to the target user, not an edge case). The previous
  -- revision of this schema had a UNIQUE(user_id) constraint that silently broke that requirement.
);
CREATE INDEX idx_smoking_profiles_user ON smoking_profiles (user_id);
CREATE INDEX idx_smoking_profiles_user_recent ON smoking_profiles (user_id, last_used_at DESC NULLS LAST); -- powers SCR-14's "recently/previously used" ordering
```

### 3.3 `cigarette_brand_reference` (optional autocomplete list — NOT a pricing source)

```sql
CREATE TABLE cigarette_brand_reference (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name      VARCHAR(100) NOT NULL,          -- generic/behavioral name shown in the SCR-05/SCR-14 brand picker, never a real trademarked logo/image
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        SMALLINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cigarette_brand_reference_name_unique UNIQUE (display_name)
);
```

- **This table exists only to speed up onboarding** (a searchable list in SCR-05's brand picker, PRD §I) — it has **no price field**, and must never be used to compute `amount_paise`. The previous revision of this schema (`simulated_products`) carried a `reference_price_paise` field that was, incorrectly, the actual pricing source for payments — that violated PRD §L.1/§L.3 and Immutable Rule 3 ("use the user's own cigarette price"). The only authoritative price for any Digital Smoking Room transaction is the selected `smoking_profiles.cost_per_stick_paise`, snapshotted onto `payment_transactions` at creation time (§3.5).
- Admin-managed, read-only to the mobile app (`GET /v1/catalog/brands`, see api-spec.md §3.5). A user typing something not on this list uses SCR-05/SCR-14's "Other / not listed" free-text fallback, which writes directly to `smoking_profiles.brand_label`.

**MVP launch seed data** (the initial India-market reference list, per project brief 2026-09-16 — load this before first build/QA pass, resolves `docs/project/final-foundation-review.md` §9 item 8):

```sql
INSERT INTO cigarette_brand_reference (display_name, sort_order) VALUES
  ('Gold Flake', 10),
  ('Classic', 20),
  ('Wills Navy Cut', 30),
  ('Four Square', 40),
  ('Red & White', 50),
  ('Scissors', 60),
  ('Bristol', 70),
  ('Cavanders', 80),
  ('Charminar', 90),
  ('Capstan', 100),
  ('Advance', 110),
  ('Mond Variance', 120);
```

This is a display-name-only seed (no pricing, no manufacturer/logo association — consistent with the table's constraints above) and is expected to grow over time via the admin API (`POST /admin/catalog/brands`, api-spec.md §3.12); it is not exhaustive and is not a claim of completeness or endorsement, only a useful starting autocomplete set for the initial India launch market.

### 3.3a `savings_destinations` (payout beneficiaries — new table)

```sql
CREATE TABLE savings_destinations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_type          VARCHAR(20) NOT NULL,      -- 'vpa' | 'bank_account'
  vpa                       VARCHAR(100),                -- set if destination_type = 'vpa'
  bank_account_number_masked VARCHAR(20),                -- last 4 digits only stored in plaintext-adjacent form; full number never persisted, only passed through to the payout provider at registration time
  bank_ifsc                 VARCHAR(11),
  account_holder_name       VARCHAR(100) NOT NULL,       -- as entered by the user
  verified_account_holder_name VARCHAR(100),              -- as confirmed by the payout provider's penny-drop/VPA validation; a mismatch vs. account_holder_name is a fraud-review flag (payment-architecture.md §5.7)
  provider_beneficiary_id   VARCHAR(100),                 -- the payout provider's registered beneficiary reference, required before any payout can target this row
  verification_status       VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | verified | failed
  is_default                 BOOLEAN NOT NULL DEFAULT false,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_savings_destinations_user ON savings_destinations (user_id);
```

- A `payment_transactions` row cannot be created (i.e., the collection leg cannot even start) unless the user has a `savings_destinations` row with `verification_status = 'verified'` — this is the DB-level expression of PRD §L.1's hard block on SCR-16.
- Editing a destination's account/VPA fields resets `verification_status` to `pending` and clears `provider_beneficiary_id`, requiring re-verification before it can be used as a payout target again (PRD §L.2, "edits require re-verification").

### 3.4 `craving_sessions`

```sql
CREATE TABLE craving_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_session_id UUID NOT NULL,              -- client-generated, for idempotent offline sync
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  intensity         SMALLINT CHECK (intensity BETWEEN 1 AND 10),
  trigger           VARCHAR(50),                -- e.g. 'stress','after_meal','social','boredom','other'
  outcome           VARCHAR(20),                -- 'resisted' | 'smoked' | 'simulated_purchase' | 'abandoned' | 'unresolved'
  coping_action     VARCHAR(50),                -- e.g. 'ai_coach','breathing_exercise','walk','none'
  linked_payment_id UUID REFERENCES payment_transactions(id), -- set if outcome = 'simulated_purchase'
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT craving_sessions_client_id_unique UNIQUE (user_id, client_session_id)
);
CREATE INDEX idx_craving_sessions_user_started ON craving_sessions (user_id, started_at DESC);
```

- `client_session_id` + unique constraint is what makes offline-sync-then-upload idempotent (device retries the same POST safely).
- `linked_payment_id` is a forward reference; created nullable, backfilled once payment resolves (see payments below — FK added via a separate migration-safe `ALTER` or created as nullable from the start, which it is here).
- **`'abandoned'` vs `'unresolved'`** (added per `docs/project/final-foundation-review.md` §4/§9 item 3): `'abandoned'` is the specific, named outcome for a craving session where the user actively exited a breathing exercise, the AI coach, or the Digital Smoking Room mid-flow without completing it (see `design/digital-smoking-room.md`'s Abandonment Handling rule and SCR-12's exit behavior) — this is a real, common, and expected outcome, not an error state. `'unresolved'` is reserved for a session that never reached any terminal outcome at all (e.g., the client crashed or the app was killed before any exit path fired) — genuinely rare, and distinct from a deliberate abandonment. Both are streak-neutral: neither resets nor advances the streak, and neither counts as a relapse or a resisted craving in Progress/analytics rollups (`analytics.md`'s `craving_abandoned` event maps to `outcome = 'abandoned'`).

### 3.5 `payment_transactions`

This is the record of a **real money movement into our platform** (not to any tobacco merchant). See [payment-architecture.md](./payment-architecture.md) for the full state machine and provider interaction.

```sql
CREATE TABLE payment_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  savings_intent_id     UUID NOT NULL,               -- client-generated per PRD §L.2/§L.3; the idempotency key shared by BOTH the collection and payout legs
  smoking_profile_id    UUID NOT NULL REFERENCES smoking_profiles(id), -- price source (replaces the old simulated_products FK)
  unit_price_paise_snapshot BIGINT NOT NULL CHECK (unit_price_paise_snapshot > 0), -- smoking_profiles.cost_per_stick_paise AT THE TIME of this transaction (profiles are user-editable later; the transaction must not retroactively change)
  quantity              SMALLINT NOT NULL CHECK (quantity > 0),
  amount_paise          BIGINT NOT NULL CHECK (amount_paise > 0), -- = unit_price_paise_snapshot * quantity, computed SERVER-SIDE at order-creation time from the user's OWN smoking_profiles row, never client-supplied — see payment-architecture.md §3.1
  currency              CHAR(3) NOT NULL DEFAULT 'INR',

  -- Collection leg (PRD §L.1 leg 1)
  provider              VARCHAR(20) NOT NULL,        -- 'razorpay' | 'cashfree' | ...
  provider_order_id     VARCHAR(100) NOT NULL,       -- provider's order/intent id, created server-side before client checkout opens
  provider_payment_id   VARCHAR(100),                -- provider's payment id, populated once a payment attempt exists
  provider_signature    TEXT,                        -- last verified signature, stored for audit (not for re-trust)

  status                VARCHAR(20) NOT NULL DEFAULT 'created',
    -- created -> pending -> succeeded | failed | cancelled
    -- succeeded -> refund_initiated -> refunded (or refund_failed)
  failure_reason        TEXT,
  idempotency_key       UUID NOT NULL,               -- client-supplied, scoped per user; = savings_intent_id

  -- Payout leg (PRD §L.1 leg 2 / §L.5a) — new columns in this revision
  savings_destination_id UUID NOT NULL REFERENCES savings_destinations(id), -- required at creation time; see §3.3a, a payment cannot be created without a verified destination
  payout_provider        VARCHAR(20),                 -- 'razorpayx_payouts' | 'cashfree_payouts' | ...
  provider_payout_id     VARCHAR(100),                -- populated once the payout is initiated
  payout_status           VARCHAR(20),                 -- NULL until collection succeeds, then 'initiated' -> 'completed' | 'failed'
  payout_failure_reason   TEXT,
  payout_initiated_at     TIMESTAMPTZ,
  payout_completed_at     TIMESTAMPTZ,

  client_platform       VARCHAR(20) NOT NULL DEFAULT 'android',
  client_app_version    VARCHAR(20),
  device_fingerprint    VARCHAR(100),                -- for fraud correlation

  verified_at           TIMESTAMPTZ,                 -- when server-side verification (signature + provider status fetch) completed
  webhook_confirmed_at  TIMESTAMPTZ,                 -- when an async webhook independently confirmed the same result

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payment_transactions_provider_order_unique UNIQUE (provider, provider_order_id),
  CONSTRAINT payment_transactions_provider_payment_unique UNIQUE (provider, provider_payment_id),
  CONSTRAINT payment_transactions_provider_payout_unique UNIQUE (payout_provider, provider_payout_id),
  CONSTRAINT payment_transactions_idempotency_unique UNIQUE (user_id, idempotency_key),
  CONSTRAINT payment_transactions_savings_intent_unique UNIQUE (savings_intent_id)
);
CREATE INDEX idx_payment_transactions_user ON payment_transactions (user_id, created_at DESC);
CREATE INDEX idx_payment_transactions_status ON payment_transactions (status) WHERE status IN ('created','pending');
CREATE INDEX idx_payment_transactions_payout_pending ON payment_transactions (payout_status) WHERE payout_status = 'initiated';
```

**Why these unique constraints matter (duplicate-money-movement defense in depth, both legs):**
- `(provider, provider_order_id)` — we create the collection order once server-side per checkout attempt; if the client retries "create order" with the same idempotency key, it gets the same order back (see below), never a second order.
- `(provider, provider_payment_id)` — even if a webhook and a client-triggered verify call race, only one row can ever claim a given provider payment ID; the second writer gets a constraint violation and is treated as a no-op confirmation of the same fact, not a new event.
- `(payout_provider, provider_payout_id)` — the payout-leg equivalent: only one row can ever claim a given provider payout ID, so a retried `initiate-payout` job (payment-architecture.md §4.1a) cannot create a second real transfer.
- `(user_id, idempotency_key)` and `(savings_intent_id)` — protects against the client double-submitting "start checkout" (double-tap, retry-on-timeout) before any provider ID even exists yet, and ties the collection and payout legs to the same logical intent end-to-end.

### 3.6 `savings_transactions` (immutable ledger)

**This table is append-only. No `UPDATE`, no `DELETE`, ever, in application code.** Corrections are new rows with negative amounts or `entry_type = 'reversal'` referencing the row being reversed.

```sql
CREATE TABLE savings_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  sequence_no       BIGSERIAL,                   -- per-table monotonic; combined with user_id gives per-user ordering
  entry_type        VARCHAR(20) NOT NULL,        -- 'credit' | 'debit' | 'reversal' | 'adjustment'
  amount_paise      BIGINT NOT NULL,             -- positive for credit, negative for debit/reversal-of-credit
  balance_after_paise BIGINT NOT NULL,           -- running balance snapshot at insert time, computed in the same DB transaction
  source_type       VARCHAR(30) NOT NULL,        -- 'payment' | 'admin_adjustment' | 'refund_reversal' — NOTE: 'goal_redemption' from the previous revision is removed; there is no redemption step in the corrected model (payment-architecture.md §4.4), 'refund_reversal' now covers payout-leg failure as well as disputes (payment-architecture.md §5.4a)
  source_payment_id UUID REFERENCES payment_transactions(id),
  reverses_txn_id   UUID REFERENCES savings_transactions(id), -- set only for entry_type='reversal'
  goal_id           UUID REFERENCES savings_goals(id),
  description       TEXT,
  idempotency_key   UUID,                        -- for entries derived from a payment, = payment's idempotency_key (dedupe safety net)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT savings_transactions_source_payment_unique UNIQUE (source_payment_id) -- one ledger credit per payment, hard stop against double-crediting
);
CREATE INDEX idx_savings_transactions_user_seq ON savings_transactions (user_id, sequence_no);
```

- `CONSTRAINT ... UNIQUE (source_payment_id)`: this is the single most important line in the schema for preventing "webhook fired twice → user credited twice." A payment can only ever produce **one** ledger credit row, enforced by the database, not just application logic.
- No `updated_at` column — by design. If it needs to change, it wasn't really append-only.
- `balance_after_paise` is written by the same service call that inserts the row, inside one transaction with the `user_savings_balance` cache update (§3.7), computed as `previous balance_after_paise + amount_paise` (or `SUM(amount_paise)` from scratch if reconciling) — never trust a client-sent balance.

### 3.7 `user_savings_balance` (materialized cache)

A derived, always-recomputable cache table so `getBalance()` is O(1) instead of summing the whole ledger on every read.

```sql
CREATE TABLE user_savings_balance (
  user_id           UUID PRIMARY KEY REFERENCES users(id),
  balance_paise     BIGINT NOT NULL DEFAULT 0,
  last_txn_id       UUID REFERENCES savings_transactions(id),
  last_txn_sequence BIGINT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Updated transactionally in the same `$transaction` as every `savings_transactions` insert:
```sql
UPDATE user_savings_balance
SET balance_paise = balance_paise + :amount_paise,
    last_txn_id = :new_txn_id,
    last_txn_sequence = :new_seq,
    updated_at = now()
WHERE user_id = :user_id;
```
A nightly reconciliation job recomputes `SUM(amount_paise)` per user from `savings_transactions` and asserts equality with `user_savings_balance.balance_paise`, alerting on any drift (see payment-architecture.md §6).

### 3.8 `savings_goals`

```sql
CREATE TABLE savings_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  title           VARCHAR(100) NOT NULL,
  target_amount_paise BIGINT NOT NULL CHECK (target_amount_paise > 0),
  target_date     DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active | completed | abandoned
  completed_at    TIMESTAMPTZ,
  icon            VARCHAR(30),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_savings_goals_user ON savings_goals (user_id, status);
```

Goal *progress* is computed on read (`SUM` of `savings_transactions.amount_paise` where `goal_id` matches). Settled MVP behavior (PRD `mvp-scope.md`, no longer an open question): a single shared balance with goals as **milestones/labels against the overall balance**, not separate sub-wallets — avoids the complexity of split ledgers at MVP and matches the fact that there's only ever one real destination account's worth of money per transaction (payment-architecture.md §1).

### 3.9 `ai_sessions` and `ai_session_messages`

```sql
CREATE TABLE ai_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  craving_session_id UUID REFERENCES craving_sessions(id), -- optional link if opened from an active craving
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  flagged           BOOLEAN NOT NULL DEFAULT false,  -- true if safety pre-filter triggered
  flag_reason       VARCHAR(50),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_session_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role          VARCHAR(10) NOT NULL,        -- 'user' | 'assistant' | 'system'
  content       TEXT NOT NULL,               -- encrypted at rest via column-level encryption or pgcrypto
  model          VARCHAR(50),                 -- e.g. 'claude-haiku-...' (null for role='user')
  latency_ms     INTEGER,
  token_count    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_session_messages_session ON ai_session_messages (session_id, created_at);
```

(Kept as two tables rather than a JSONB blob on `ai_sessions` so retention/deletion and per-message metadata — latency, model, token count — are queryable without rewriting the whole session on every turn.)

### 3.10 `notifications`

```sql
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  template_key  VARCHAR(50) NOT NULL,      -- e.g. 'milestone_day_7', 'payment_succeeded', 'craving_checkin'
  dedupe_key    VARCHAR(100),              -- prevents duplicate sends of the same logical notification
  title         VARCHAR(150) NOT NULL,
  body          TEXT NOT NULL,
  data          JSONB,                     -- deep-link payload
  channel       VARCHAR(10) NOT NULL DEFAULT 'push', -- push | sms | in_app
  status        VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | sent | delivered | failed | read
  sent_at       TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notifications_dedupe_unique UNIQUE (user_id, dedupe_key)
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
```

### 3.11 `analytics_events`

Internal, server-authoritative event log (distinct from PostHog, which is the external product-analytics tool events are also mirrored to).

```sql
CREATE TABLE analytics_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),         -- nullable for pre-auth/anonymous events
  event_name    VARCHAR(60) NOT NULL,
  source        VARCHAR(10) NOT NULL,               -- 'client' | 'server'
  properties    JSONB NOT NULL DEFAULT '{}',
  session_id    UUID,                                -- app session correlation id, client-generated
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_events_user_time ON analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name_time ON analytics_events (event_name, created_at DESC);
```

Partition this table by month once volume warrants it (Postgres native range partitioning on `created_at`) — not needed at MVP scale but the schema is compatible with adding it later without a breaking change.

---

## 4. Supporting tables (required for the integrity guarantees above)

### 4.1 `idempotency_keys`

Generic idempotency store used by the `IdempotencyInterceptor` (system-architecture.md §3.2) for **any** mutating endpoint, not just payments.

```sql
CREATE TABLE idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  key             UUID NOT NULL,               -- client-supplied Idempotency-Key header
  route           VARCHAR(100) NOT NULL,       -- e.g. 'POST /v1/payments'
  request_hash    VARCHAR(64) NOT NULL,        -- sha256 of normalized request body, to detect key-reuse-with-different-payload (reject as conflict)
  status          VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing | completed | failed
  response_status INTEGER,
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,

  CONSTRAINT idempotency_keys_unique UNIQUE (user_id, key, route)
);
```
Rows older than 24–48h can be purged by a scheduled job (idempotency windows don't need to live forever).

### 4.2 `webhook_events`

Raw, unmodified record of every inbound webhook call from a payment provider, before any interpretation.

```sql
CREATE TABLE webhook_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              VARCHAR(20) NOT NULL,
  provider_event_id     VARCHAR(150) NOT NULL,   -- provider's own event/delivery id
  event_type            VARCHAR(50) NOT NULL,    -- e.g. 'payment.captured', 'payment.failed', 'refund.processed'
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  signature_valid       BOOLEAN NOT NULL,
  raw_payload           JSONB NOT NULL,
  processing_status     VARCHAR(20) NOT NULL DEFAULT 'received', -- received | processed | ignored_duplicate | invalid_signature | error
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at          TIMESTAMPTZ,

  CONSTRAINT webhook_events_provider_event_unique UNIQUE (provider, provider_event_id)
);
CREATE INDEX idx_webhook_events_payment ON webhook_events (payment_transaction_id);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events (processing_status) WHERE processing_status = 'received';
```
`(provider, provider_event_id)` unique constraint is the duplicate-webhook defense: providers explicitly document at-least-once delivery with retries, and this makes replays a guaranteed no-op at the DB layer regardless of application logic correctness.

### 4.3 `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(64) NOT NULL,      -- sha256 of the actual token; raw token never stored
  device_id     VARCHAR(100) NOT NULL,
  family_id     UUID NOT NULL,             -- rotation family; reuse-of-a-rotated-token revokes the whole family (theft detection)
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  replaced_by   UUID REFERENCES refresh_tokens(id),

  CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
```
See security.md §2.3 for the rotation/reuse-detection algorithm this schema supports.

### 4.4 `device_tokens` (FCM)

```sql
CREATE TABLE device_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token     TEXT NOT NULL,
  device_id     VARCHAR(100) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT device_tokens_unique UNIQUE (user_id, device_id)
);
```

### 4.5 `audit_log`

Append-only, broader than `webhook_events`/`savings_transactions` — covers admin actions and account lifecycle events that need a permanent record for disputes/compliance.

```sql
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type    VARCHAR(10) NOT NULL,       -- 'user' | 'admin' | 'system'
  actor_id      UUID,
  action        VARCHAR(60) NOT NULL,       -- 'payment.status_changed', 'account.deletion_requested', 'admin.balance_adjusted', ...
  target_type   VARCHAR(30),
  target_id     UUID,
  metadata      JSONB NOT NULL DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_target ON audit_log (target_type, target_id);
CREATE INDEX idx_audit_log_actor ON audit_log (actor_type, actor_id);
```

---

## 5. Transaction integrity: how the required scenarios are handled

| Scenario | Mechanism |
|---|---|
| **Duplicate payments** (user double-taps "pay") | Client generates one `idempotency_key` per checkout attempt before calling `createPayment`; DB unique constraint `(user_id, idempotency_key)` on `payment_transactions` guarantees a second call with the same key returns the existing order/result instead of creating a new charge. |
| **Duplicate webhooks** | `(provider, provider_event_id)` unique constraint on `webhook_events`. Handler is written as: insert-or-ignore into `webhook_events` first (in its own small transaction), and only proceed to business-logic processing if the insert actually happened (i.e., it wasn't already there). |
| **Idempotency (general)** | Generic `idempotency_keys` table + `IdempotencyInterceptor` for all mutating endpoints; payment-specific idempotency additionally enforced at the domain-table level (belt and suspenders, since money is the highest-consequence case). |
| **Refunds** | `payment_transactions.status` transitions `succeeded → refund_initiated → refunded/refund_failed`; a refund **never deletes or edits** the original `savings_transactions` credit row — it inserts a new `entry_type='reversal'` row referencing it via `reverses_txn_id`, with a negative `amount_paise`. Net balance is correct; history is fully auditable. |
| **Failed payments** | `status='failed'` is a terminal state; no ledger row is ever created for a payment that never reached `succeeded`. `failure_reason` stores the provider's decline reason for support/analytics. |
| **Payment pending** | `status='pending'` is a valid, displayed-to-user state (never silently treated as failure or success). A scheduled job polls `getPaymentStatus` for any transaction stuck in `pending`/`created` beyond a threshold (e.g. 15 min) and resolves it via provider query, independent of whether a webhook ever arrives. |
| **Reconciliation** | Nightly job fetches the provider's settlement/transaction report for the prior day and compares against local `payment_transactions` (by `provider_payment_id`): flags (a) provider has a payment we don't ("orphan capture" — must be investigated, possibly refunded since we can't attribute it), (b) we have a `succeeded` payment the provider report doesn't confirm (critical alert), (c) amount mismatches. Separately, nightly job recomputes each user's ledger balance from `savings_transactions` and diffs against `user_savings_balance` (should always be zero-diff; any drift is a bug alert, not an expected occurrence). |
| **User deleting account** | See §7 below — financial rows are never deleted, only the `users` row is anonymized/soft-deleted after a grace period. |
| **Fraud** | `users.risk_score`, `payment_transactions.device_fingerprint`, and velocity checks (e.g., max payments per hour/day per user, per device, per phone-number-prefix) implemented as a guard in the `payments` module consulting Redis counters; see security.md §6. |
| **Manipulated client requests** | `amount_paise` on `payment_transactions` is **always** computed server-side from the user's own `smoking_profiles.cost_per_stick_paise * quantity` at order-creation time (snapshotted into `unit_price_paise_snapshot`) — the client sends only `smoking_profile_id` + `quantity`, never a price. Any client-supplied amount/price field is ignored if present (DTO doesn't even define one). Same principle applies to anything that affects money: server recomputes, never trusts. |
| **Fraudulent payout destination** | A `savings_destinations` row must reach `verification_status='verified'` (via the payout provider's penny-drop/VPA validation) before it can be referenced by any `payment_transactions.savings_destination_id` — enforced at the service layer before order creation. |
| **Unreasonable self-reported price (fat-finger entry)** | `smoking_profiles.pack_price_paise`/`cost_per_stick_paise` are constrained to be positive at the DB layer (`CHECK > 0`, §3.2); a tighter, product-tunable sanity ceiling (e.g., a few thousand rupees per pack) is enforced at the service layer on every `POST`/`PATCH /smoking-profiles`, not hard-coded as a DB `CHECK`, since the exact bound is a business setting, not a structural invariant (payment-architecture.md §5.7). |

---

## 6. Prisma-specific notes

- Use `Decimal`/`BigInt` mapping carefully: Prisma maps Postgres `BIGINT` to JS `BigInt` by default for safety with large paise values — the API layer must serialize these as strings in JSON (never as raw `number`) to avoid precision loss on the client.
- All ledger-affecting service methods must use `prisma.$transaction([...])` or the interactive transaction API with **`isolationLevel: Serializable`** for the read-check-write sequence in `SavingsLedger.recordSavings` (read current balance → validate → insert → update cache) to prevent lost updates under concurrent requests for the same user (e.g., a payment webhook and a manual admin adjustment racing).
- Migrations are the only way schema changes reach any environment — no `prisma db push` in staging/prod, only `prisma migrate deploy`.

---

## 7. Account deletion & data retention

1. User requests deletion → `users.status = 'deletion_pending'`, `deleted_at` NOT yet set. A **14-day grace period** starts (configurable), during which the user can cancel by logging back in.
2. On grace-period expiry (scheduled job):
   - `users` row: PII fields (`phone_number`, `email`, `display_name`, `date_of_birth`) are overwritten with anonymized placeholders (`deleted-<uuid>`), `deleted_at` set. The row itself is **kept** (not hard-deleted) because financial tables FK-reference it and financial records must be retained for statutory periods regardless of account deletion.
   - `smoking_profiles`, `craving_sessions`, `ai_sessions`/`ai_session_messages`, `device_tokens`, `notifications`: hard-deleted (genuinely personal/behavioral data with no retention requirement once the account is gone).
   - `payment_transactions`, `savings_transactions`, `webhook_events`, `audit_log`: **retained**, unlinked from identity by virtue of the anonymized `users` row (the FK stays intact for referential/statutory integrity, but no PII is reachable through it anymore).
3. This satisfies India's DPDP Act 2023 "right to erasure" while respecting that financial transaction records generally must be retained for audit/tax purposes — see [security.md](./security.md) §7 for the compliance framing.
