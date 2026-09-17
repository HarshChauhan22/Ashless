# System Architecture — India-First Android Smoking Cessation App

Status: MVP architecture, ready for implementation. No code has been written against this spec yet.

Related documents: [database-schema.md](./database-schema.md) · [api-spec.md](./api-spec.md) · [payment-architecture.md](./payment-architecture.md) · [security.md](./security.md) · [deployment.md](./deployment.md)

---

## 1. High-Level Architecture

### 1.1 Component map

```
                                   ┌─────────────────────────────┐
                                   │        Android App          │
                                   │  Kotlin + Jetpack Compose    │
                                   │  (MVVM, offline cache: Room) │
                                   └───────────────┬──────────────┘
                                                    │ HTTPS (TLS 1.3, cert pinning)
                                                    │ REST + JSON, JWT bearer
                                    ┌───────────────▼───────────────┐
                                    │        API Gateway / LB        │
                                    │  (managed LB + rate limiting)  │
                                    └───────────────┬───────────────┘
                                                     │
                        ┌────────────────────────────┼────────────────────────────┐
                        │                            │                            │
              ┌─────────▼─────────┐        ┌─────────▼─────────┐        ┌─────────▼─────────┐
              │   NestJS Backend   │        │  Webhook Ingress   │        │   Admin/Ops API    │
              │  (modular REST)    │        │ (Razorpay/Cashfree │        │  (internal, VPN/   │
              │                    │        │  signature-verified)│       │   IP-allowlisted)  │
              └─────────┬──────────┘        └─────────┬──────────┘        └─────────┬──────────┘
                        │                              │                            │
        ┌───────────────┼──────────────────────────────┼────────────────────────────┘
        │               │                              │
┌───────▼──────┐ ┌──────▼───────┐            ┌─────────▼──────────┐
│  PostgreSQL   │ │ Redis (Upstash)│           │  Job Queue (BullMQ) │
│  (Prisma ORM) │ │ cache + queue  │           │ reconciliation,      │
│  primary DB   │ │ backing store  │           │ notifications, AI    │
└───────────────┘ └────────────────┘           │ moderation, retries  │
                                                └───────────┬───────────┘
                                                            │
                       ┌────────────────────────────────────┼───────────────────────────┐
                       │                                    │                            │
             ┌─────────▼─────────┐                ┌─────────▼─────────┐        ┌─────────▼─────────┐
             │ Payment Provider   │                │  Anthropic Claude  │        │       FCM          │
             │ (Razorpay, collect │                │  (craving coach)   │        │  (push notif.)      │
             │  leg — PA)         │                └────────────────────┘        └────────────────────┘
             └─────────┬──────────┘
                       │ on collection success, immediately
             ┌─────────▼──────────┐
             │ Payout Provider     │   forwards the same amount to the user's OWN
             │ (RazorpayX Payouts, │   Savings Destination — this leg is required
             │  payout leg)        │   MVP infrastructure, not a later phase.
             │  → user's bank/VPA  │   See payment-architecture.md §1.
             └─────────┬──────────┘
                       │
             ┌─────────▼─────────┐
             │  PostHog (events)  │
             │  product analytics │
             └────────────────────┘
```

### 1.2 Core architectural principles

1. **Server is the source of truth for everything financial.** The mobile app never decides whether a payment succeeded, what the savings balance is, or what a cigarette costs. It only *displays* what the server returns and *initiates* actions.
2. **The backend never touches tobacco commerce, and never keeps the user's money.** There is no merchant-of-record relationship with any cigarette brand or retailer, and cigarette pricing is always the user's own self-reported price, never an admin catalog price. Money collected from the user (via a licensed Payment Aggregator) is forwarded straight back out to the user's own designated Savings Destination in the same flow, as a payout — it is never recognized as platform revenue and never held. See [payment-architecture.md](./payment-architecture.md) §1 and `docs/product/PRD.md` §L (canonical) for the full two-leg (collect-then-payout) model this implies.
3. **Provider-agnostic boundaries.** Both money-movement legs — collection (`PaymentProvider`) and payout (`PayoutProvider`) — plus the ledger (`SavingsLedger`) are defined as interfaces first. Razorpay/RazorpayX are the MVP implementations; swapping to Cashfree or adding a second PA for redundancy must not touch business logic. See [payment-architecture.md](./payment-architecture.md) §2.
4. **Immutable, append-only ledger for money.** No `UPDATE` ever changes a historical financial fact. Corrections are new rows (reversals/adjustments), never mutations. See [database-schema.md](./database-schema.md) §4.
5. **Idempotency everywhere money or push notifications are involved.** Every client-initiated mutating call that touches payments carries a client-generated idempotency key. Every webhook is deduped by provider event ID.
6. **Offline-tolerant client, online-authoritative server.** The Android app can track cravings and view cached data offline, but nothing that mutates money, ledger balance, or account state is trusted from local state — it's always re-fetched/re-verified from the server before being shown as final.

### 1.3 Recommended stack (summary)

| Layer | Choice | Why |
|---|---|---|
| Mobile | Kotlin, Jetpack Compose, MVVM + Clean Architecture | Native Android performance & Play Store trust for a payments-adjacent health app; Compose is the current Google-recommended UI toolkit and is well-documented for coding agents |
| Local mobile storage | Room + DataStore | Offline cravings tracking, cached catalog/profile |
| Backend framework | Node.js 22 LTS + TypeScript + NestJS | Opinionated modular structure (modules/controllers/services/DI) that keeps large codebases navigable for coding agents; first-class support for guards (auth), interceptors (idempotency/logging), pipes (validation) |
| ORM | Prisma 5.x | Type-safe schema, migrations, matches team's existing experience (see `chatbot-saas` project) |
| Database | PostgreSQL 16 (managed: Neon or Railway Postgres for MVP, RDS/Aurora at scale) | Relational integrity is mandatory for a financial ledger; JSONB for flexible fields |
| Cache / queues | Redis (Upstash serverless for MVP) + BullMQ | Idempotency locks, rate limiting, scheduled notification jobs, reconciliation jobs |
| Auth | Phone OTP via Firebase Auth (SMS delivery) + backend-issued JWT session | India-first UX (phone number is the primary identifier, not email); backend never trusts the client's claim of verification — see [security.md](./security.md) |
| Payments (collection leg) | Razorpay (Payment Aggregator, RBI-regulated) — UPI Intent/Collect, cards, netbanking | PA-PG license, strong webhook + signature support, good India documentation; abstracted behind `PaymentProvider` |
| Payouts (payout leg — **MVP-required, not Phase 2**) | RazorpayX Payouts / Cashfree Payouts | Forwards every successful collection to the user's own Savings Destination automatically, per transaction — this is core infrastructure for the non-custodial model, not a deferred feature (see [payment-architecture.md](./payment-architecture.md) §1, §7) |
| AI coach | Anthropic Claude (Haiku-class model for chat, called server-side only) | Fast, inexpensive, good instruction-following for a guarded CBT-style coaching prompt; never called directly from the mobile app |
| Push notifications | Firebase Cloud Messaging (FCM) | Standard for Android, free, integrates with WorkManager on client |
| Analytics | PostHog (self-serve cloud, EU/US hosting or self-hosted later) | Event-based product analytics with session replay option; generous free tier suits MVP budget |
| Object storage | Cloudflare R2 or S3-compatible | Profile photos, exported ledger statements (PDF) |
| Deployment (MVP) | Railway or Fly.io (backend containers) + managed Postgres + Upstash Redis | Cheapest path to a production-grade, autoscaling-capable deployment without managing Kubernetes on day one |
| Deployment (scale) | AWS ECS Fargate / EKS, RDS Postgres Multi-AZ, ElastiCache Redis | Migration path once traffic/compliance needs grow — see [deployment.md](./deployment.md) |
| CI/CD | GitHub Actions | Backend: build/test/deploy on merge to main. Mobile: build + Play Console internal track via Fastlane |
| Observability | Sentry (errors, both mobile + backend), Grafana Cloud or Better Stack (logs/metrics), Prometheus-compatible metrics from NestJS | Inexpensive managed tiers cover MVP scale |

This stack is chosen to be inexpensive at MVP (mostly usage-based/free-tier services), horizontally scalable later, well documented (large communities), and structured in a way that keeps each concern (module, table, provider) in its own file/folder so a coding agent can locate and modify the right place without cross-cutting surprises.

---

## 2. Mobile Architecture

### 2.1 Pattern

**Clean Architecture + MVVM**, single-module-first (split into Gradle modules only when the codebase demands it — do not pre-split for a team of one).

```
app/
├── di/                     # Hilt modules
├── data/
│   ├── remote/             # Retrofit API interfaces, DTOs
│   ├── local/              # Room DAOs/entities, DataStore
│   └── repository/         # Repository implementations (single source of truth)
├── domain/
│   ├── model/               # Plain Kotlin domain models
│   ├── repository/          # Repository interfaces
│   └── usecase/             # One class per use case (e.g. StartCravingSessionUseCase)
├── presentation/
│   ├── auth/
│   ├── home/
│   ├── tracker/
│   ├── smokingroom/         # Digital Smoking Room + catalog + checkout
│   ├── savings/             # Ledger, goals, history
│   ├── cravingcoach/        # AI chat UI
│   ├── profile/
│   └── common/              # Shared composables, theme
└── core/
    ├── network/             # OkHttp client, interceptors, error mapping
    ├── security/            # Encrypted prefs, cert pinning config
    └── util/
```

- **DI**: Hilt.
- **Networking**: Retrofit + OkHttp + Moshi/kotlinx.serialization. A single `AuthInterceptor` attaches the access token; a single `TokenAuthenticator` performs refresh-token rotation on 401 (see [security.md](./security.md) §2.3).
- **State**: `StateFlow`-based ViewModels exposing a sealed `UiState` (`Loading`, `Success`, `Error`) per screen.
- **Offline data**: Room caches `smoking_profiles` (plural — a user may have several, database-schema.md §3.2), `cigarette_brand_reference` (autocomplete list, database-schema.md §3.3), and locally-queued `craving_sessions` (synced with a server-issued `client_session_id` for idempotent upsert). Financial data (`payment_transactions`, `savings_transactions`, balances, `savings_destinations`) is **never** persisted as the source of truth locally — it is fetched fresh and only cached for last-known-good display with a visible "as of" timestamp and pull-to-refresh.
- **Payments**: Uses Razorpay's Android SDK (Checkout) to open the native UPI intent flow. The SDK is used *only* to collect payment and return a `razorpay_payment_id`/order reference to the app — the app never computes success itself; it hands the reference to the backend's `verifyPayment` endpoint and polls/streams `getPaymentStatus` (see [payment-architecture.md](./payment-architecture.md) §3).
- **Background work**: WorkManager for: (a) periodic craving-session sync, (b) scheduled local notification fallback if FCM is delayed, (c) daily savings-summary refresh.
- **Security on-device**: `EncryptedSharedPreferences`/Jetpack Security for refresh token storage, TLS certificate pinning (backup pins rotated per release), root/emulator detection flags surfaced to backend risk scoring (not used to hard-block, to avoid false positives), no screenshots on payment/checkout screens (`FLAG_SECURE`).

### 2.2 App-to-backend contract

The app talks **only** to our backend (`api.<domain>.com`). It never calls Razorpay's server APIs directly except the client SDK's own checkout handshake (which is designed to be public/client-safe — order creation and verification always happen server-side, see §7).

---

## 3. Backend Architecture

### 3.1 Module boundaries (NestJS)

```
src/
├── auth/                 # OTP verification, JWT issuance/refresh, device sessions
├── users/                # Profile, account lifecycle, deletion
├── smoking-profile/      # Multiple brand/price profiles per user (database-schema.md §3.2), the pricing source for every save
├── catalog/              # cigarette_brand_reference autocomplete list only (admin-managed display names, no price field — database-schema.md §3.3)
├── savings-destinations/ # Payout beneficiary registration + provider verification (penny-drop/VPA), CRUD (api-spec.md §3.5)
├── tracker/              # Craving sessions, streaks, stats
├── payments/             # PaymentProvider abstraction (collection leg) + Razorpay adapter, collection webhook ingress
├── payouts/              # PayoutProvider abstraction (payout leg) + RazorpayX adapter, payout webhook ingress, payout retry/failure handling (payment-architecture.md §4.1a)
├── ledger/               # SavingsLedger, goals, balance projection — no redemption (payment-architecture.md §4.4)
├── ai-coach/             # Claude proxy, session storage, safety filter
├── notifications/        # FCM dispatch, notification preferences, templates
├── analytics/            # Server-side event emission to PostHog, internal audit log
├── reconciliation/       # Scheduled jobs comparing PA settlement vs local ledger
├── admin/                # Internal ops endpoints (IP-allowlisted + separate auth)
├── common/               # Guards, interceptors (idempotency, logging), filters (error mapping), decorators
└── infra/                # Prisma service, Redis client, queue module, config module
```

Each module owns its Prisma models' business logic; no module reaches into another module's repository directly — cross-module calls go through exported services (NestJS provider exports), keeping boundaries enforceable and easy for a coding agent to reason about in isolation.

### 3.2 Request lifecycle (mutating endpoints)

```
Request → RateLimitGuard → JwtAuthGuard → IdempotencyInterceptor
        → ValidationPipe (class-validator DTO)
        → Controller → Service (business logic, DB transaction)
        → LoggingInterceptor (structured log + audit trail if financial)
        → Response
```

- **IdempotencyInterceptor**: for any route tagged `@Idempotent()`, requires an `Idempotency-Key` header; looks up `idempotency_keys` table (see [database-schema.md](./database-schema.md) §5.11); if a completed response exists for that key + user, returns it verbatim without re-executing business logic; if in-flight, returns `409 Processing`.
- All financial mutations run inside a single Prisma `$transaction` with `Serializable` isolation for balance-affecting writes (see §4.4 of database-schema.md for why).

### 3.3 Why NestJS over a lighter framework

A framework with built-in DI, guards, and interceptors materially reduces the chance that a future change (e.g., "add fraud check to every payment route") is applied inconsistently — the check becomes a single guard, not a copy-pasted `if` in N controllers. This matters more here than typical CRUD apps because of the financial-integrity requirements below.

---

## 4–8. Database, API, Auth, Payments, Ledger

See dedicated documents:
- [database-schema.md](./database-schema.md) — full schema, all 10 required tables plus supporting tables (idempotency keys, webhook events, refresh tokens, device tokens, audit log), transaction-integrity design.
- [api-spec.md](./api-spec.md) — REST conventions, versioning, all endpoints grouped by domain, error envelope, pagination, idempotency header contract.
- [security.md](./security.md) — authentication deep dive (OTP → JWT), authorization, encryption, DPDP Act 2023 compliance, mobile hardening, fraud controls.
- [payment-architecture.md](./payment-architecture.md) — `PaymentProvider` / `PayoutProvider` / `SavingsLedger` interfaces, the two-leg collect-then-payout UPI flow, webhook handling, reconciliation, refunds, and the legal framing (no redemption step — see PRD §L).

---

## 9. AI Architecture (Craving Coach)

### 9.1 Design goals

- Available the moment a craving hits (low latency, short responses first, expand on request).
- Safe: this is a health-adjacent, at-risk-moment feature. It must never encourage smoking, must recognize crisis language (self-harm, severe withdrawal distress) and redirect to a real helpline, and must not give medical advice beyond general harm-reduction/CBT-style coping guidance.
- Cost-controlled: usage-capped per user per day at the free tier; no runaway spend from a single account.

### 9.2 Flow

```
Android app --POST /v1/ai-coach/sessions/{id}/messages--> Backend
Backend:
  1. AuthGuard verifies JWT
  2. RateLimit: max N messages/user/day (configurable), 429 if exceeded
  3. Loads craving_sessions context (trigger, intensity, streak, time since quit) from DB
  4. Loads last K turns of this ai_sessions conversation for context window
  5. Safety pre-filter (keyword + lightweight classification) on user message
     - if crisis indicators found → short-circuits to a fixed safe response with
       helpline numbers (India: iCall 9152987821, KIRAN 1800-599-0019) and logs
       a flagged ai_sessions.flags entry for a human-review queue; does NOT skip
       to model call in that turn.
  6. Calls Anthropic Claude (server-side SDK, API key in secrets manager only)
     with a fixed system prompt (versioned, stored in code, not user-editable)
     encoding: identity as a craving-coping coach, CBT/urge-surfing techniques,
     brevity, no medical/diagnostic claims, escalate-to-helpline rule.
  7. Streams response back to app via chunked HTTP (SSE) for perceived speed.
  8. Persists user + assistant turns to ai_sessions.messages (JSONB array or
     child table — see database-schema.md §5.9).
  9. Emits analytics event ai_coach_message_sent (no message content, only
     metadata: session id, trigger tag, latency, token count) to PostHog.
```

### 9.3 Model & cost

- Default model: a Haiku-class Claude model (fast, inexpensive) for real-time chat.
- Escalate to a stronger model only for a periodic "weekly reflection" summary feature (batch, not real-time), if added post-MVP.
- All model calls go through a single `ai-coach/claude.service.ts` wrapper so the model ID is a config value, not scattered across the codebase — trivial to bump when Anthropic ships a new model.

### 9.4 Data retention

`ai_sessions` messages are personal, sensitive (health) data. Encrypt at rest (Postgres column-level encryption or full-disk + restricted access role), retain per user-configurable policy, and hard-delete on account deletion (see security.md §7).

---

## 10. Analytics Architecture

### 10.1 Two tracks, deliberately separate

1. **Product analytics (PostHog)** — funnel/engagement events, fired from both client (UI interactions: screen views, button taps) and server (source-of-truth events: `payment_succeeded`, `savings_credited`, `goal_completed`). Client-fired events are for UX insight only and are never used to drive money or ledger logic.
2. **Internal audit log (Postgres `analytics_events` + dedicated `audit_log` table for financial actions)** — an immutable, queryable record used for support, fraud investigation, and reconciliation, not just product metrics. Every state transition on `payment_transactions` and `savings_transactions` also writes an `analytics_events` row server-side (see database-schema.md §5.10).

### 10.2 Event taxonomy (representative)

| Event | Fired by | Purpose |
|---|---|---|
| `app_opened`, `screen_viewed` | Client | Engagement |
| `craving_session_started/ended` | Client → confirmed server-side on sync | Core behavior metric |
| `smoking_room_save_initiated` | Client | Funnel step |
| `payment_succeeded` / `payment_failed` | **Server only**, from verified webhook/verify call (collection leg) | Money-movement truth — never platform revenue, see payment-architecture.md §1 |
| `savings_credited` | **Server only**, from ledger service, on collection success | Ledger truth |
| `payout_succeeded` / `payout_failed` | **Server only**, from payout webhook/sweep (payment-architecture.md §4.1a) | Confirms the money actually reached the user's own Savings Destination; `payout_failed` is the trigger for the auto-refund-and-reverse path |
| `goal_created` / `goal_completed` | Server | Retention driver |
| `ai_coach_message_sent` | Server (metadata only) | AI usage |
| `notification_delivered/opened` | Client + FCM delivery receipt | Notification effectiveness |
| `account_deleted` | Server | Compliance/audit |

### 10.3 Pipeline

Server events are emitted via a thin `AnalyticsService.track()` call inside the same transaction/service method that performs the underlying state change (not via a separate cron scraping the DB), guaranteeing every financial fact has a corresponding event. Events are queued (BullMQ) and flushed to PostHog asynchronously so PostHog latency/downtime never blocks the request path.

---

## 11. Notification Architecture

### 11.1 Channels

- **Push (FCM)** — primary channel: craving check-ins, milestone/streak celebrations, savings goal progress, AI coach re-engagement, and the one payment-related notification that actually needs to interrupt the user: a **payout-leg failure** (payment-architecture.md §5.4a) — the save already showed as successful, so this is the sole async follow-up that must reach the user, directing them to fix their Savings Destination.
- **In-app** — a notification center backed by the `notifications` table, always available even if push delivery failed.
- **SMS (India, via the same aggregator used for OTP or a dedicated transactional SMS provider like MSG91)** — reserved for critical/transactional-only messages (payout failure) as a fallback, rate-limited to avoid cost blowup.

### 11.2 Flow

```
Trigger (scheduled job | domain event, e.g. "payment verified") 
  → NotificationService.enqueue(userId, templateKey, payload)
  → BullMQ job → NotificationWorker
      1. Load user preferences (opted-out categories, quiet hours)
      2. Render template (i18n: English + Hindi at MVP, extensible)
      3. Insert notifications row (status=PENDING)
      4. Send via FCM Admin SDK to all active device_tokens for user
      5. Update notifications.status based on FCM response
      6. On FCM "token not registered" → deactivate that device_token row
```

- Idempotent by `(user_id, template_key, dedupe_key)` — e.g., a "day 7 milestone" notification can only be enqueued once per user.
- Scheduled craving-support nudges use a rules engine (simple cron + query, not a generic engine at MVP): e.g., "if no craving_session logged in 48h and quit_date is within last 14 days, send re-engagement."

---

## 12. Security Architecture

See [security.md](./security.md) for the full treatment (authentication, authorization, encryption, DPDP Act 2023 compliance, mobile hardening, fraud/anti-tampering, secrets management).

---

## 13. Error Handling

### 13.1 Backend

- Global `HttpExceptionFilter` maps all thrown errors to a single JSON envelope (see api-spec.md §3).
- Domain errors are typed exceptions (`PaymentAlreadyProcessedError`, `SavingsDestinationNotVerifiedError`, `PaymentAmountMismatchError`, `IdempotencyConflictError`, etc.) caught centrally and mapped to stable `code` strings the mobile app can switch on — never leak raw stack traces or Prisma errors to the client.
- Every payment/webhook handler wraps provider calls in explicit try/catch with typed provider-error mapping (network timeout vs. declined vs. invalid signature are handled differently — see payment-architecture.md §5).
- Unhandled exceptions still produce a `500` with a generic message + a `traceId` (also attached to the Sentry event) so support can correlate a user report to a log entry without exposing internals.

### 13.2 Mobile

- All repository methods return a sealed `Result<T, AppError>` (no raw exceptions crossing into ViewModels).
- Network errors are classified: `NoConnection`, `Timeout`, `ServerError(code)`, `Unauthorized` (triggers refresh-token flow), `PaymentPending` (specific UX: "we're checking your payment" with poll, not a generic failure).
- Payment screens explicitly render a **third state beyond success/failure: pending/unknown**, with a "Check status" action that calls `getPaymentStatus` — the UI must never claim success without a server-confirmed status.

---

## 14. Logging

- **Structured JSON logs** (pino on the backend) with a consistent shape: `timestamp, level, traceId, userId (hashed for non-financial logs, plain for financial audit logs restricted to secure sinks), route, event, durationMs`.
- **Request tracing**: every request gets a `traceId` (generated at the edge or propagated from a client-sent header), attached to all logs and to the Sentry scope for that request.
- **Sensitive data policy**: never log full card numbers, UPI VPAs beyond the last 4 chars, OTPs, JWTs, or AI coach message content in plain application logs. Payment provider raw payloads are stored only in the dedicated `webhook_events` table (access-restricted), not in general logs.
- **Audit logging**: financial and account-lifecycle actions (payment state change, ledger entry, refund, account deletion, admin override) write to an append-only `audit_log` table in addition to structured logs — this is the record used for disputes and compliance, and must survive log-retention rotation policies that apply to general application logs.
- Log retention: general app logs 30–90 days (cost-controlled); `audit_log` and `webhook_events` retained per financial record-keeping requirements (recommend 7 years, matching Indian financial record norms), independent of the log pipeline's own retention.

---

## 15. Monitoring

| Concern | Tool | Alerts |
|---|---|---|
| Error tracking (mobile + backend) | Sentry | New error type, error-rate spike, any exception in `payments/` or `ledger/` modules paged immediately |
| APM / latency | Sentry Performance or built-in NestJS + OpenTelemetry → Grafana Cloud | p95 latency per route, DB query time |
| Infra metrics | Provider-native (Railway/Fly metrics) → Grafana Cloud dashboards at scale | CPU/memory/connection pool saturation |
| Business/financial health | Custom Grafana dashboard fed by scheduled queries: daily payment success rate, webhook lag, reconciliation mismatches | Payment success rate drop >X%, any unreconciled transaction older than 24h, webhook processing lag >5 min |
| Uptime | Better Stack / UptimeRobot on `/health` endpoint | Backend down, DB unreachable |
| Queue health | BullMQ Board / Bull Board | Dead-letter queue growth, job failure rate |

A `/health` endpoint checks DB connectivity, Redis connectivity, and payment-provider reachability (lightweight, cached) and is used by both the uptime monitor and the deployment platform's health checks.

---

## 16. Scalability

### 16.1 MVP scale assumption

Design for low thousands of DAU at launch, architected so the *only* changes needed to reach ~100k DAU are infrastructure sizing, not rewrites:

- **Stateless backend** — any number of NestJS instances behind the load balancer; sessions live in JWT + Redis, not process memory.
- **DB read scaling** — Prisma supports read replicas; heavy read paths (catalog, ledger history) can be pointed at a replica once write load on primary matters. Not needed at MVP.
- **Queue-based async work** — notifications, analytics flushes, reconciliation, and AI moderation callbacks are all queued (BullMQ/Redis) rather than done inline, so traffic spikes degrade gracefully (queue depth grows) instead of timing out requests.
- **Idempotency + locking scale horizontally** — implemented via DB unique constraints + Redis locks, not in-process state, so they remain correct across multiple backend instances.
- **Catalog and static content** — the `cigarette_brand_reference` autocomplete list is cached at the edge (CDN) since it changes rarely and is admin-managed (it carries no price, so staleness has no financial consequence).
- **Hot path isolation** — payment webhook ingestion is a separate, minimal-dependency route (no heavy business logic inline) so a slow downstream (e.g., notification dispatch) can never cause the payment provider to see a timeout and retry-storm us; webhook handler does minimal validation + write to `webhook_events` + enqueue processing, then returns `200` fast.

### 16.2 Growth path

MVP (Railway/Fly + managed Postgres/Redis) → Phase 2 (AWS: ECS Fargate services per module boundary if needed, RDS Multi-AZ, ElastiCache, SQS instead of BullMQ if queue volume outgrows Redis) — see [deployment.md](./deployment.md) §5 for the concrete migration triggers.

---

## 17. Deployment Architecture

See [deployment.md](./deployment.md).
