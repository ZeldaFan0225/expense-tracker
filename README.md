# Expense Flow

Encrypted money management for modern teams: Expense Flow pairs AES-256-GCM encryption, scoped API keys, and automation
with a polished React + Tailwind desktop workspace and responsive mobile experience.

## TL;DR

- **Purpose**: Track expenses, income, and recurring automation with analytics, CSV import/export, and sharable API keys
  backed by a Prisma + PostgreSQL backend.
- **Who it serves**: GitHub-authenticated users. Sessions are stored in the database, and every monetary/descriptive
  field is encrypted before Prisma stores it.
- **Experience**: Desktop dashboard inside `DashboardShell` (fixed sidebar + scrollable content) plus mobile pills.
  Guided onboarding (`/onboarding`) and quick actions (`⌘/Ctrl+K` command palette) stay consistent across flows.

## Feature highlights

- **Expense & income flows** – single/bulk expense builder with split tracking (`splitBy`), recurring templates, import
  wizards, and CSV preview/edit paths.
- **Analytics** – cash-history charts, Sankey-style budget flow, anomaly detection helpers, CSV exports, and scenario
  planning via `analytics-service`.
- **Automation** – background worker materializes recurring incomes/expenses, enforces API key expirations, and powers
  import schedules. Configurable via `AUTOMATION_*` env vars.
- **Security** – AES-256-GCM encryption helpers, bcrypt-hashed API keys, NextAuth 5 session auth (GitHub provider +
  Prisma adapter), middleware headers (CSP, HSTS, etc.), and in-memory token-bucket rate limiting.
- **Developer tooling** – shadcn-inspired UI primitives, `DashboardShell`, and `cn` helpers for consistent styling.
  `AGENTS.md` holds the full architecture & recreation guide.

## Tech & dependencies

- **Framework** – Next.js App Router 16 with React 19, server components mixed with client actions and hooks.
- **Styling** – Tailwind CSS v4 with custom `@theme inline` tokens in `src/app/globals.css`, plus `src/components/ui/*`
  primitives inspired by shadcn/ui.
- **Auth & session** – NextAuth 5 (GitHub provider), Prisma credentials, and `auth.ts` /
  `src/app/api/auth/[...nextauth]/route.ts` wiring.
- **Database** – Prisma 6 with migrations under `prisma/migrations`. Encrypted financial payloads stored as JSON via
  helpers in `src/lib/encryption.ts`.
- **Utilities** – `date-fns`, `nanoid`, `csv-parse`, `lucide-react`, and `tsx` for the automation worker.
  `src/lib/utils.ts` exports `cn` plus helpers.

## Getting started (development)

1. **Install dependencies** (NextAuth 5 may need legacy peer deps):
   ```bash
   npm install
   ```
2. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```
   Then populate:
    - `DATABASE_URL` → PostgreSQL connection string
    - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
    - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
    - `ENCRYPTION_KEY` → 32-byte base64 (`openssl rand -base64 32`)
    - Optional automation knobs: `AUTOMATION_INTERVAL_MS` (default 5 min), `AUTOMATION_RESTART_DELAY_MS` (default 10s),
      `AUTOMATION_DISABLED=1` to skip the worker.
3. **Generate Prisma client + schema sync**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
   Use `db push` only for local dev; prod should always run `npx prisma migrate deploy`.
4. **Run the app**:
   ```bash
   npm run dev
   ```
   Auth via GitHub will land users in the dashboard shell; unauthenticated visitors see `LandingHero`.

## Database migrations & data handling

- `20241012_add_expense_split_by`: adds `splitBy` to `Expense`, migrating `impactAmountEncrypted` into an explicit
  per-row share count. The UI and services now compute `impactAmount` via `calculateImpactShare(amount, splitBy)`.
- `20250106_add_onboarding_flag`: adds `onboardingCompleted` on `User`, gating private routes until the setup flow is
  finished.
- Always run `npx prisma migrate deploy` in prod so these migrations apply in order.
- Before dropping legacy columns (e.g., `impactAmountEncrypted`), backfill data using the provided scripts (see
  `UPDATE.md`).

## Deployment checklist

1. **Set production environment** variables (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GITHUB_*`,
   `ENCRYPTION_KEY`, optional automation envs). Keep `NEXT_USE_TURBOPACK=0` for reproducible builds.
2. **Install deps** (use `npm ci` for deterministic installs).
3. **Generate Prisma client**: `npx prisma generate`.
4. **Apply migrations**: `npx prisma migrate deploy` (do **not** run `db push` in prod).
5. **Build Next.js**: `NEXT_USE_TURBOPACK=0 npm run build`.
6. **Start server**: `NODE_ENV=production npm run start` (behind PM2/systemd/Docker). Next.js automatically spawns the
   automation worker unless `AUTOMATION_DISABLED` is set.
7. **Smoke test**: sign in, create expenses/incomes, ensure recurring materialization and API key revocations run (check
   logs or `action` feed).

## API & services overview

- Expenses, recurring expenses/income, categories, imports, API keys, analytics, and dashboard data live in
  `src/lib/services/*`. All services restrict queries to `userId`, decrypt/encrypt via `src/lib/encryption`, and rely on
  `calculateImpactShare` from `src/lib/expense-shares`.
- API routes under `src/app/api/*` authenticate through `src/lib/api-auth.ts`. Browser sessions and API keys share rate
  limiting (120 req/min by default) via `consumeToken`.
- New endpoints include `/api/export` (CSV), `/api/expenses/replace`, `/api/import` preview/routes, `/api/recurring`,
  `/api/income`, `/api/api-keys`, and `/api/settings`.

## Security & governance

- AES-256-GCM encryptors for money/description fields; decrypted only in server services.
- API keys hashed with bcrypt (12 rounds) and scoped via `ApiScope` enums. Raw keys display only during creation and are
  revoked automatically by the automation worker when expired.
- Middleware (`middleware.ts`) sets CSP, HSTS, Permissions Policy, and other headers.
- `authenticateRequest` enforces scopes and rate limits. Automation worker also enforces `AUTOMATION_DISABLED` toggles.

## Troubleshooting

- Missing Prisma client: rerun `npx prisma generate`.
- NextAuth tables missing: `npx prisma db push` for dev or `npx prisma migrate deploy` for prod.
- Automation worker errors: check env vars, ensure `tsx` is installed (`npm install tsx` used by default), and that the
  worker isn’t disabled by `AUTOMATION_DISABLED=1`.
- API rate limits: non-privileged keys or sessions can hit 429; respect the `Retry-After` header.

## Contributing & publishing notes

- Follow `AGENTS.md` for the full architecture/feature/integration guide before extending or rebuilding the product.
- Keep encrypted payloads serialized via `serializeEncrypted` before writing to Prisma.
- If you introduce new migrations, run `npx prisma migrate dev` locally and commit the generated files under
  `prisma/migrations`.
- Use `npm run dev` for iterative work, `npm run build` for production checks, and `npm start` for the production
  server.

## License

Expense Flow is released under the MIT License. See `LICENSE.md` for details.
