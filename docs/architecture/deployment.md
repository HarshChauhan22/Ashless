# Deployment Architecture

Related: [system-architecture.md](./system-architecture.md) · [security.md](./security.md)

---

## 1. Environments

| Environment | Purpose | Payment mode | Data |
|---|---|---|---|
| `local` | Developer machines | Razorpay test mode | Local Postgres (Docker) or a dev branch of the managed DB |
| `staging` | Pre-prod validation, QA, Play Console internal testing builds point here | Razorpay test mode | Seeded/synthetic data, periodically reset |
| `production` | Real users, real money | Razorpay live mode | Real data, full backup/monitoring |

Config is environment-driven (`.env` per environment, values injected via the deployment platform's secrets, never committed). A single `AppConfigModule` in the NestJS app validates required env vars at boot (fail fast if a required secret is missing) — this prevents the class of bug where a missing prod secret is only discovered when the first real payment fails.

---

## 2. MVP infrastructure (cost-optimized, still production-grade)

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub repo (monorepo: /backend, /mobile, /docs)             │
└───────────────┬─────────────────────────────┬─────────────────┘
                 │ push to main                 │ tag release
        ┌────────▼────────┐            ┌────────▼────────┐
        │ GitHub Actions   │            │ GitHub Actions   │
        │ (backend CI/CD)  │            │ (mobile release) │
        └────────┬────────┘            └────────┬────────┘
                 │ build+push image             │ build AAB, sign,
                 │ deploy                        │ upload via Fastlane
        ┌────────▼────────┐            ┌────────▼────────┐
        │ Railway / Fly.io │            │ Google Play      │
        │ (backend         │            │ Console          │
        │  container,      │            │ (internal →      │
        │  autoscale 1-N)  │            │  closed → prod)  │
        └────────┬────────┘            └──────────────────┘
                 │
     ┌───────────┼───────────────────────┐
     │           │                       │
┌────▼─────┐ ┌───▼──────┐        ┌───────▼───────┐
│ Managed   │ │ Upstash   │        │ BullMQ workers │
│ Postgres  │ │ Redis     │        │ (same container│
│ (Neon or  │ │ (queues + │        │  or a separate │
│  Railway) │ │  cache)   │        │  worker process)│
└───────────┘ └───────────┘        └────────────────┘
```

### Why this over Kubernetes at MVP

Railway/Fly give container deploys, autoscaling, managed TLS, and zero-downtime deploys with a fraction of the operational overhead of running Kubernetes for a single backend service. This is explicitly a **cost/maintainability decision for MVP scale** (low thousands of DAU) — §5 below defines the concrete triggers for migrating to AWS.

### Component choices

- **Backend hosting**: Railway (simplest DX, generous free/hobby tier, built-in Postgres/Redis add-ons if preferred over Neon/Upstash) or Fly.io (better if low-latency multi-region matters later, since it deploys close to users). Either is acceptable; pick one and document the choice in the repo README — this spec does not hard-require one over the other.
- **Database**: Neon (serverless Postgres, branching for preview environments, generous free tier, Mumbai-adjacent latency via its region options) or Railway's managed Postgres add-on for simplicity of having everything in one dashboard at MVP. Either satisfies the relational-integrity requirements in database-schema.md.
- **Redis**: Upstash (serverless, pay-per-request, no idle cost — ideal for MVP's uneven traffic) for both BullMQ queue backing and rate-limit/idempotency-lock counters.
- **Worker process**: BullMQ workers can run as a second process within the same Railway/Fly service (a `worker` start command alongside the `web` command) or a separate deployable — separate is preferable once queue volume grows, to avoid webhook-ingress latency competing with CPU-heavy AI-proxy or notification-fanout work for the same process.
- **Object storage**: Cloudflare R2 (S3-compatible API, no egress fees) for profile photos and exported ledger PDFs.
- **CDN**: Cloudflare in front of the catalog's static image assets; the API itself is not cached at the CDN (dynamic/authenticated).

---

## 3. CI/CD pipeline (backend)

`.github/workflows/backend-ci.yml` (on PR): lint → typecheck → unit tests → Prisma migration dry-run (`prisma migrate diff` against the target DB schema) → build.

`.github/workflows/backend-deploy.yml` (on merge to `main`):
1. Build Docker image, tag with commit SHA.
2. Run `prisma migrate deploy` against the target environment's DB **before** the new container receives traffic (migration must be backward-compatible with the currently-running previous version during the brief overlap — see §4).
3. Deploy new container (Railway/Fly rolling deploy).
4. Run a smoke test against `/health` and a read-only endpoint.
5. On failure at any step, deploy is aborted and the platform keeps serving the previous healthy container (no manual rollback needed for a failed deploy step; see §6 for rollback of a *successfully deployed but broken* release).

Secrets are injected by the platform (Railway/Fly secret store), referenced by name in the workflow, never printed to logs.

---

## 4. Database migration strategy

- **Expand/contract pattern** for anything touching a live table with traffic: add new columns/tables as nullable/additive first (deploy), backfill, switch application code to use the new shape (deploy), then drop old columns in a later migration — never a single migration that both adds a NOT NULL column and requires the new application code simultaneously, since the deploy step in §3 runs migrations slightly ahead of the new code going live.
- Financial tables (`payment_transactions`, `savings_transactions`, `webhook_events`) are especially conservative: no destructive migrations ever (no dropped columns, no type narrowing) without an explicit archival step first.
- All migrations reviewed in PR like any other code change; `prisma migrate deploy` is idempotent and safe to re-run.

---

## 5. Growth path: when to move off the MVP stack

| Trigger | Action |
|---|---|
| Sustained DB CPU/connection saturation on the managed Postgres tier | Move to RDS/Aurora Postgres with read replicas; point read-heavy routes (catalog, ledger history) at a replica |
| BullMQ/Upstash queue depth or cost growing faster than linearly with users | Move queue backend to AWS SQS (or self-hosted Redis on ElastiCache) |
| Need for multi-region latency (e.g., expansion beyond India) | Fly.io multi-region deploy, or move to AWS with region-local ECS services + a global DB strategy (out of scope until actually needed) |
| Compliance/scale requiring VPC isolation, dedicated network controls, or SOC2-style audit | Migrate backend to AWS ECS Fargate (or EKS if the team already has k8s expertise) inside a VPC, RDS Multi-AZ, Secrets Manager, WAF in front of the ALB |
| Webhook/payment volume high enough that a single reconciliation job run takes too long | Shard reconciliation by date range/user cohort, run in parallel workers |

None of these require changing the `PaymentProvider`/`SavingsLedger` interfaces, the database schema's core integrity design, or the module boundaries in system-architecture.md §3.1 — they are infrastructure-layer changes only.

---

## 6. Release process & rollback

### 6.1 Backend
- Rolling deploy (Railway/Fly default) — new container must pass health check before old one is drained, giving zero-downtime deploys.
- **Rollback**: redeploy the previous image tag (kept in the registry for at least the last N releases). Because migrations are expand/contract (§4), the previous image tag remains compatible with the current DB schema for a rollback to work safely — this is *why* the expand/contract discipline matters, not just a nice-to-have.
- Feature flags (a simple `feature_flags` config table or an env-var-driven flag service) gate risky features (e.g., a new payout provider adapter, or a second Savings Destination type) so they can be disabled instantly without a redeploy.

### 6.2 Mobile (Android)
- Staged rollout via Google Play Console: internal testing → closed testing (beta group) → production, with **staged production rollout** (e.g., 10% → 25% → 50% → 100% over several days), monitoring Sentry crash rate and payment-success-rate dashards at each stage before advancing.
- Play Console's "halt rollout" is the mobile equivalent of a backend rollback — used immediately if the crash-free rate or payment success rate regresses.
- The backend's minimum-supported-app-version check (api-spec.md §5) is the safety net for when a mobile rollback isn't fast enough (Play Store propagation isn't instant) — the backend can reject old, buggy client versions server-side.
- Signing: Play App Signing (Google-managed signing key) + a securely stored upload key, never committed to the repo.

---

## 7. Backup & disaster recovery

- **Database**: automated daily snapshots (managed provider default) + point-in-time recovery (PITR) enabled — required given this is a financial ledger; target RPO ≤ 5 minutes (PITR), RTO ≤ 1 hour for MVP.
- **Quarterly restore drill**: actually restore a snapshot to a scratch environment and verify integrity (including that `savings_transactions` sums still match `user_savings_balance`) — an untested backup is not a backup.
- **Webhook replay safety net**: because `webhook_events` stores the full raw payload, a restored/rolled-back database can be brought back in sync by re-processing any webhook events with `processing_status != 'processed'` after restore, plus the reconciliation job (payment-architecture.md §6) as the final catch-all.

---

## 8. Cost estimate framing (MVP, order-of-magnitude)

Kept intentionally rough — actual numbers depend on final provider pricing at build time:

| Item | Approx. monthly cost driver |
|---|---|
| Backend hosting (Railway/Fly, 1-2 small instances) | Usage-based, low tens of USD at low-thousands DAU |
| Postgres (Neon/Railway managed) | Free–low tens of USD at MVP data volume |
| Redis (Upstash) | Pay-per-request, single-digit USD at MVP volume |
| Razorpay | No fixed fee; transaction fee % on successful payments only (revenue-linked, not a fixed burn) |
| Firebase Auth (phone) | Free tier covers a meaningful volume of OTP verifications; SMS cost applies beyond it |
| Anthropic Claude (AI coach) | Usage-based on tokens; capped by the per-user daily message rate limit (system-architecture.md §9.3) to bound worst-case spend |
| FCM | Free |
| PostHog | Free tier covers MVP event volume |
| Sentry | Free/low tier covers MVP error volume |
| Domain + misc | Low, fixed |

This is designed so the **only meaningfully variable cost tied to growth is AI usage and Razorpay's per-transaction fee**, both of which scale with actual usage/revenue rather than being a fixed burn that has to be justified before the product has traction.
