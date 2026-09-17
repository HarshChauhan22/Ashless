# Security Architecture

Related: [system-architecture.md](./system-architecture.md) · [database-schema.md](./database-schema.md) · [payment-architecture.md](./payment-architecture.md) · [api-spec.md](./api-spec.md)

---

## 1. Threat model summary

This app combines three sensitive categories: **health data** (smoking/addiction status, AI coach conversations), **financial flows** (real UPI payments), and **an at-risk user population** (people actively resisting addiction, some in crisis moments). The security posture is designed around:

- A malicious or compromised **client** must never be able to affect money, another user's data, or the catalog.
- A **leaked access token** should have a short blast radius (short TTL, revocable refresh tokens).
- **Payment data** never touches our servers in raw form (PA handles card/UPI details; we only ever see tokens/references).
- **Health-adjacent data** (smoking profile, craving logs, AI chat) is treated as sensitive personal data under India's DPDP Act 2023, with encryption, minimal retention, and full user control (export/delete).

---

## 2. Authentication architecture

### 2.1 Primary method: phone number + OTP

India-first UX means phone number, not email, is the primary identifier (matches local user expectation and avoids email-verification friction).

**Chosen pattern**: Firebase Authentication (Phone) on the Android client for OTP delivery/verification, backend independently verifies the resulting Firebase ID token server-side before issuing our own session.

```
Android App                          Firebase Auth                 Backend
    │  requests OTP via Firebase SDK        │                          │
    │───────────────────────────────────────>│                          │
    │  Firebase sends SMS, user enters code  │                          │
    │  SDK returns a Firebase ID token       │                          │
    │<────────────────────────────────────────│                          │
    │  POST /v1/auth/otp/verify                                          │
    │  { firebase_id_token }                                             │
    │────────────────────────────────────────────────────────────────────>│
    │                                         Backend verifies the ID token
    │                                         server-side via Firebase Admin SDK
    │                                         (checks signature, issuer, expiry,
    │                                         phone_number claim) — never trusts
    │                                         a client-asserted phone number.
    │                                         Upserts users row by verified
    │                                         phone_number, issues OUR OWN
    │                                         access_token (JWT) + refresh_token.
    │  { access_token, refresh_token, user }                              │
    │<────────────────────────────────────────────────────────────────────│
```

**Why not roll our own SMS/OTP**: Firebase Auth offloads SMS delivery reliability, abuse/fraud detection (it has its own reCAPTCHA/SafetyNet-based abuse prevention for OTP requests), and cost at MVP scale — reinventing this is pure risk for no product differentiation. The backend's own JWT is still what actually gates API access; Firebase is only the phone-verification step.

**Rate limiting on OTP request**: enforced both by Firebase and by our own `POST /auth/otp/request` endpoint (if a custom SMS path is used instead/additionally) — per-phone-number and per-IP limits, exponential backoff on repeated requests, to prevent SMS-bombing abuse.

**Age gating**: tobacco-cessation content requires 18+. `date_of_birth` is collected at onboarding (self-declared — no reliable government ID check at MVP) and enforced client-side + server-side (`PATCH /users/me` rejects `date_of_birth` implying age < 18). This is a reasonable-effort control, not a hard identity-verification gate; document this limitation for legal review.

### 2.2 Session tokens

- **Access token**: JWT, HS256 or RS256 (RS256 preferred so verification key can be distributed without exposing the signing key, relevant if the admin API or future services need to verify tokens independently), **15-minute TTL**, contains `sub` (user id), `iat`, `exp`, `jti`. Stateless verification on every request (no DB hit needed for a valid, unexpired token) — fast and horizontally scalable.
- **Refresh token**: opaque random 256-bit value, **30-day TTL**, stored **hashed** (`token_hash`, SHA-256) in `refresh_tokens` (database-schema.md §4.3) — the raw value is never persisted server-side, only ever held on-device (EncryptedSharedPreferences).

### 2.3 Refresh token rotation & reuse detection

On every `POST /auth/refresh`:
1. Look up `refresh_tokens` by `sha256(presented_token)`.
2. If not found, or `revoked_at` set, or expired → `401`, force full re-login.
3. If found and valid: issue a new access+refresh pair, mark the presented refresh token `revoked_at = now()`, `replaced_by = <new token id>`, and the new token inherits the same `family_id`.
4. **Reuse detection**: if a refresh token that is already `revoked_at IS NOT NULL` is presented again, this means either a race (two near-simultaneous refreshes from the same legitimate client — tolerated with a short grace window of a few seconds) or a **stolen token being replayed after the legitimate client already rotated past it**. If outside the grace window: revoke the **entire `family_id`** (all descendant tokens), forcing full re-login on all devices sharing that family, and flag the account for review (`users.risk_score` bump, `audit_log` entry).

### 2.4 Google Sign-In — deferred to V1, not built in MVP

**Decision (2026-09-16, see `docs/project/DECISIONS.md`): Google Sign-In is cut from MVP scope.** PRD Functional Requirement 1 and `mvp-scope.md` item 1 specify phone+OTP as the sole MVP auth method, and the UX design (`design/screen-specifications.md` SCR-03) does not include a Google Sign-In affordance — this section previously described a built feature that no other canonical document actually scoped for MVP. The design below is retained as a V1 option, not deleted, since the implementation is a small, self-contained addition if the product decides to add it later (`mvp-scope.md` §Q):

`POST /auth/google` would accept a Google ID token, verified server-side via Google's public keys (standard OIDC verification), same resulting session-issuance path as phone OTP. If built, phone number would still need to be requested afterward if not already on the Google account, since payments/notifications infra assumes a verified phone number. **Do not build this endpoint or any client-side Google Sign-In UI for MVP.**

### 2.5 Authorization

- Simple two-role model at MVP: `user` (default) and `admin` (internal ops only, separate `admin_users` table/auth path — **not** a flag on the regular `users` table, to keep the admin auth boundary structurally separate from consumer auth).
- Every resource-scoped endpoint (`GET /craving-sessions/{id}`, etc.) checks `resource.user_id === jwt.sub` — enforced via a `@OwnResource()` guard/decorator applied consistently, not ad-hoc per controller, so a coding agent adding a new endpoint gets this by following the existing pattern rather than remembering it.
- Admin API (`/v1/admin/*`): separate JWT audience (`aud: 'admin'`, rejected by the consumer `JwtAuthGuard` and vice versa), plus IP allowlist at the load-balancer/infra level, plus mandatory audit logging of every admin action (database-schema.md §4.5).

---

## 3. API & transport security

- **TLS 1.2+ only** (prefer 1.3), HSTS enabled, no plaintext HTTP endpoint exposed publicly.
- **Certificate pinning** on the Android client (backup pins included, rotated with enough lead time before primary cert expiry to avoid bricking old app versions — document the pin rotation runbook alongside the mobile release process in deployment.md).
- **CORS**: backend has no public web frontend at MVP; CORS can be locked to deny all browser origins by default (the API is consumed by the native app and server-to-server webhooks only).
- **Rate limiting**: `@nestjs/throttler` (or Redis-backed token bucket) applied globally, with tighter limits on `auth/*` and `payments/*` than read-only routes.
- **Input validation**: every DTO uses `class-validator` decorators; `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` globally, so unexpected/extra fields (e.g., a client trying to sneak an `amount_paise` into a payment creation request) are rejected outright, not silently ignored.
- **Security headers**: `helmet` middleware (CSP not very relevant for a pure JSON API, but `X-Content-Type-Options`, `X-Frame-Options`, etc. still applied defensively for the admin web UI if one exists).

---

## 4. Data protection & encryption

| Data class | At rest | In transit | Notes |
|---|---|---|---|
| Passwords | N/A — no passwords exist in this system (OTP/OAuth only) | — | Removes an entire class of credential-stuffing risk |
| Refresh tokens | Hashed (SHA-256), never stored raw | TLS | See §2.2 |
| Payment instrument data (card/UPI VPA) | **Never stored by us** — tokenized entirely by Razorpay | TLS, handled inside Razorpay's SDK/hosted checkout | We only ever see provider references (`provider_payment_id`) |
| `ai_session_messages.content` | Column-level encryption (pgcrypto `pgp_sym_encrypt` or application-layer AES-256-GCM with a key from the secrets manager) | TLS | Health-adjacent free text; highest sensitivity in the schema |
| `smoking_profiles`, `craving_sessions` | Standard Postgres at-rest encryption (provider-managed disk encryption, e.g. RDS/managed-PG default) | TLS | Sensitive but structured/categorical, not free text |
| `users.phone_number`, `date_of_birth` | Standard at-rest encryption | TLS | PII, protected primarily via access control + the anonymization-on-deletion flow |
| Database backups | Encrypted (provider default) | — | Access restricted to infra admins only |
| Secrets (API keys, JWT signing key, webhook secrets, DB credentials) | Managed secrets store (Railway/Fly secrets, or AWS Secrets Manager at scale) — **never** in source control, `.env` files committed, or client-side code | TLS | Rotation runbook documented in deployment.md |

---

## 5. Mobile app hardening (OWASP MASVS-aligned)

- `FLAG_SECURE` on checkout, savings, and profile screens to block screenshots/screen recording.
- Root/emulator detection (e.g., via Play Integrity API) is **signal, not a hard gate** — feed into `device_fingerprint`/risk scoring server-side rather than blocking legitimate rooted-device users outright (avoids false-positive support burden), except optionally hard-blocking only the payment flow specifically if risk signals compound.
- Play Integrity API attestation attached to `POST /v1/payments` requests as an additional server-side check (reject if attestation fails verification) — this directly defends against "manipulated client requests" by confirming the request actually originates from the genuine, untampered app binary running on a genuine device/OS, not an emulator or repackaged APK.
- No sensitive data (tokens, PII) in logs, crash reports, or backup (`android:allowBackup="false"` or scoped backup rules excluding secure prefs).
- ProGuard/R8 obfuscation enabled for release builds.
- Deep links validated (App Links with `autoVerify`, not arbitrary custom schemes) to prevent notification/deep-link spoofing into sensitive screens.

---

## 6. Fraud & abuse controls

| Vector | Control |
|---|---|
| Duplicate/rapid payment attempts | Idempotency keys (payment-architecture.md §3.3) + Redis velocity counters (max N payment attempts/user/hour, max N/device/day) |
| Price/amount tampering | Server-computed pricing only; DTOs reject unexpected fields (§3 `forbidNonWhitelisted`) |
| Fat-fingered self-reported cigarette price (not adversarial, but could otherwise trigger an unexpectedly large real payment) | `POST`/`PATCH /smoking-profiles` enforces sanity bounds on `pack_price_paise`/`cost_per_stick_paise`, `422 price_out_of_range` if exceeded (payment-architecture.md §5.7) |
| Forged payment success claims | Server never trusts client-reported status; always independently verifies signature + re-fetches from provider (payment-architecture.md §3.2–3.3) |
| Forged/replayed webhooks | HMAC signature verification + `UNIQUE(provider_event_id)` dedupe (payment-architecture.md §3.4) |
| Fraudulent Savings Destination (routing payouts to an account that isn't the user's own) | Payout provider's beneficiary verification (penny-drop/VPA name-match) required **at MVP** before a destination can receive a payout — not a Phase 2 KYC gate, a precondition of the payout leg working at all (payment-architecture.md §5.7); mismatch flags for manual review |
| Multi-account abuse (creating many accounts to move small amounts through payouts) | Device fingerprinting + phone-number verification (a real SIM per account) + `risk_score` accumulation + per-account/per-device payout velocity limits |
| Account takeover via refresh-token theft | Rotation + reuse detection (§2.3), short access-token TTL, "log out everywhere" endpoint |
| Repackaged/tampered APK calling our API | Play Integrity attestation on sensitive routes (§5) |
| Automated/bot signups | OTP + Firebase's built-in abuse detection; consider CAPTCHA on `otp/request` if abuse is observed post-launch |
| Admin insider risk | Separate admin auth boundary, full `audit_log` on every admin mutation, no direct-DB-edit path for balances (payment-architecture.md §4.1) |

`users.risk_score` is a simple additive score (not ML at MVP): incremented by defined events (failed signature attempts, velocity breaches, refresh-token reuse, reconciliation mismatches attributed to the account) and consulted as a threshold gate on Savings Destination registration and payout initiation, and to prioritize manual review queues. This is intentionally simple and observable rather than a black-box model, so a coding agent (or a human reviewer) can trace exactly why an account was flagged.

---

## 7. Compliance: India DPDP Act 2023

The app processes personal data of Indian residents and must treat the DPDP Act 2023 as the primary framework (in addition to Google Play's own Data Safety and Families/health-app policies where applicable):

- **Consent**: explicit, granular consent captured at onboarding for (a) core account data processing, (b) AI coach conversation processing, (c) marketing notifications (separate opt-in, not bundled with functional notifications) — stored with a timestamp, not just a boolean flag, and re-collected if the privacy policy materially changes.
- **Purpose limitation**: data collected (smoking habits, craving patterns) is used only for the stated cessation-support purpose — no undisclosed secondary use (e.g., selling behavioral data to advertisers) — this should be a hard product/legal commitment reflected in the privacy policy, and technically enforced by *not building* any such data-sharing pipeline.
- **Right to access/portability**: `GET /users/me/export` (api-spec.md §3.2).
- **Right to erasure**: the deletion flow in database-schema.md §7 — full deletion of personal/behavioral data, anonymized retention of financial records only where legally required.
- **Data localization consideration**: while DPDP 2023 doesn't impose blanket data-localization like some other regimes, hosting the primary database in a region with good India latency (ap-south-1/Mumbai, or a Neon/Railway region close to India) is both a performance and a data-residency-friendly choice — confirm the chosen managed-DB provider's available regions during deployment setup.
- **Significant Data Fiduciary considerations**: unlikely to apply at MVP scale, but the architecture (audit logs, consent records, DPO-reachable contact in-app) is designed not to preclude compliance if the user base grows into that classification later.
- **Data Protection Officer / grievance contact**: expose a support contact/grievance-redressal path in-app (a settings screen field, not a technical build item here, but worth flagging so it isn't missed at launch).

Get an actual lawyer to review the privacy policy and ToS before processing real payments and health-adjacent data at scale — this document defines the technical controls that make that review possible, not the review itself.

---

## 8. Secrets management

- All provider API keys (Razorpay, Firebase Admin, Anthropic, FCM server key), the JWT signing key, webhook secrets, and DB credentials live in the deployment platform's secrets store (Railway/Fly secrets at MVP; AWS Secrets Manager/Parameter Store at scale — see deployment.md).
- No secret is ever committed to source control; `.env.example` documents required variable *names* only.
- Separate secrets per environment (dev/staging/prod) — a staging Razorpay key must be a **test-mode** key, never capable of moving real money, so a staging misconfiguration cannot cause real charges.
- Secret rotation runbook: documented per-secret rotation procedure (particularly the JWT signing key — needs a brief dual-key overlap window so in-flight tokens don't all invalidate instantly) in deployment.md.

---

## 9. Dependency & build security

- Automated dependency vulnerability scanning (GitHub Dependabot or `npm audit` in CI) on every backend PR.
- Lockfiles committed (`package-lock.json`), reproducible builds.
- Mobile: Gradle dependency lock + Play Console's automated pre-launch security scan as a secondary check.
