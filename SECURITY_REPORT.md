# Expense Flow Security Summary (May 2025)

## Context & Scope
- Repository: Expense Flow (Next.js 16 / React 19 / Tailwind CSS v4 / Prisma 6).
- Inputs: `AGENTS.md` product contract, `README.md`, security-related source (encryption, auth, middleware, services).
- Focus: present-day security posture, observed weaknesses, and deployment advice for production parity.

## Defensive Highlights
1. **Encrypted domain data** – `encryptString/encryptNumber` enforce AES-256-GCM for all sensitive Prisma writes, so descriptions and monetary values never rest in plaintext (src/lib/encryption.ts:1-104, src/lib/services/expense-service.ts:33-135).
2. **Auth + scope enforcement** – every API route calls `authenticateRequest`, which validates NextAuth sessions or bcrypt-backed API keys, checks scopes, and rate-limits per identifier/path combo (src/lib/api-auth.ts:1-108).
3. **API key lifecycle** – secrets are random `exp_<prefix>_<secret>` strings hashed with bcrypt (12 rounds), only shown once to the user, and revoked automatically once `expiresAt` passes thanks to the automation worker (src/lib/api-keys.ts:1-34, src/lib/services/api-key-service.ts:17-41, src/lib/automation/automation-worker.ts:35-90).
4. **Middleware hardening** – global middleware applies HSTS, frame busting, Permissions Policy, DNS prefetch control, and a baseline CSP to shrink common browser attack surface (middleware.ts:4-35).
5. **Strict payload validation** – Zod schemas wrap every service boundary (expenses, CSV import, API keys, settings, etc.), preventing type confusion and overlong inputs from touching Prisma directly (src/lib/validation.ts:1-104).

## Notable Gaps & Risks
1. **Permissive CSP directives** – `'unsafe-inline'` and `'unsafe-eval'` are still enabled so legacy components work, leaving room for XSS until inline scripts/styles are removed or the CSP is tightened (middleware.ts:16-24).
2. **CSV import resource exhaustion** – file uploads are fully buffered with `File.arrayBuffer()` + `csv-parse` and lack MIME/size enforcement, meaning a large CSV can starve memory/CPU; streaming parsers or server-side caps are needed (src/lib/services/import-service.ts:77-158).
3. **Process-local rate limiting** – the in-memory token bucket resets per server instance and after restarts, so clustered deployments need a shared limiter (Redis, edge WAF, Fly Replay) to keep abuse controls intact (src/lib/rate-limit.ts:6-29).
4. **API key metadata exposure** – `GET /api/api-keys` returns each record and its hashed secret, which is unnecessary for clients; trim sensitive fields before responding (src/app/api/api-keys/route.ts:10-45).

## Production Deployment Considerations
1. **Environment** – define `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, GitHub OAuth keys, and a base64 32-byte `ENCRYPTION_KEY`; tune automation flags (`AUTOMATION_INTERVAL_MS`, `AUTOMATION_RESTART_DELAY_MS`, `AUTOMATION_DISABLED`) and keep `NEXT_USE_TURBOPACK=0`.
2. **Install & build** – run `npm ci`, then `npx prisma generate` and `npx prisma migrate deploy` (or `db push` for staging), followed by `NEXT_USE_TURBOPACK=0 npm run build`.
3. **Run** – start with `NODE_ENV=production npm run start` behind your process manager; the automation worker (tsx child) will boot unless explicitly disabled, so ensure dev dependencies remain available or precompile the worker.
4. **Smoke test** – authenticate via GitHub, create fresh expenses/income, exercise recurring materialization, and confirm automation logs + API key revocation to verify background jobs.

## Recommended Next Actions
1. Eliminate inline scripts/styles (or move them behind hashes) so the CSP can drop `'unsafe-inline'`/`'unsafe-eval'`.
2. Introduce upload guards for CSV endpoints (content-type checks, size caps, streaming parser) to prevent denial-of-service vectors.
3. Replace the in-memory limiter with a shared service (Redis, Upstash, Fly, Cloudflare Turnstile/WAF) ahead of horizontal scaling.
4. Sanitize API-key list/create responses to omit hashed secrets and other unused internals, returning only metadata the dashboard actually needs.
