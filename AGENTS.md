# Expense Flow — Agent Guide

This document explains **everything a new coding agent needs** to rebuild or extend Expense Flow with full feature
parity. It covers the tech stack, folder layout, data model, business logic, API surface, and UI behavior so another
agent can recreate the product without reverse‑engineering the repository.

---

## 1. Product TL;DR

- **Purpose**: Encrypted, multi-user expense & income tracker with fast entry, recurring automation, analytics, CSV
  import/export, and scoped API keys.
- **Users**: Authenticated via GitHub OAuth (NextAuth) with database sessions.
- **Data guarantees**: All monetary + descriptive fields stored as AES-256-GCM encrypted JSON payloads. API keys hashed
  with bcrypt. Rate limited at 120 req/min.
- **Experience**: Desktop-first dashboard with fixed-height sidebar (`DashboardShell`). Mobile layouts fall back to top
  nav pills.

---

## 2. Tech Stack & Dependencies

| Area                  | Details                                                                                                                                         |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| Framework             | Next.js App Router (16.x) with React 19                                                                                                         |
| Styling               | Tailwind CSS v4 + custom CSS variables (`src/app/globals.css`), shadcn-inspired UI components in `src/components/ui/*`                          |
| Auth                  | NextAuth 5 beta, GitHub provider, Prisma adapter, DB sessions                                                                                   |
| Database              | PostgreSQL via Prisma 6 (`prisma/schema.prisma`)                                                                                                |
| Forms/Validation      | React Hook Form (client) + Zod schemas in `src/lib/validation.ts`                                                                               |
| Charts                | Recharts (see analytics components)                                                                                                             |
| Encryption & Security | Node `crypto` AES-256-GCM helpers, bcryptjs for API keys, in-memory token bucket (`src/lib/rate-limit.ts`), hardened headers in `middleware.ts` |
| Utilities             | date-fns, nanoid, csv-parse, lucide-react icons                                                                                                 |

`package.json` scripts: `npm run dev`, `npm run build`, `npm start`.

---

## 3. Repository Layout

```
src/
  app/                # Route groups, pages, API routes, global CSS/layout
  components/         # UI + feature components (dashboard, expenses, analytics, import, etc.)
  lib/                # Core utilities, Prisma client, services, encryption, auth helpers
prisma/
  schema.prisma       # Data model
  migrations/         # Prisma migrations (if any)
  seed.mjs            # Optional data loader
auth.ts               # NextAuth configuration (GitHub OAuth)
middleware.ts         # Security headers & CSP
components.json       # shadcn component registry metadata
```

Key layout details:

- Every authenticated page wraps content with `DashboardShell` (`src/components/layout/dashboard-shell.tsx`), giving a
  fixed-height sidebar + independently scrolling right pane.
- `src/components/providers` contains the root `SessionProvider` + custom `ThemeProvider`.
- Feature-specific components live under folders that match routes (e.g., `components/expenses/*` backs `/items`,
  `components/analytics/*` backs `/analytics`).

---

## 4. Environment & Setup

1. **Dependencies**
   ```bash
   npm install
   ```
2. **Environment variables** (`.env`):
    - `DATABASE_URL` – PostgreSQL connection.
    - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
    - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (or `AUTH_GITHUB_*`, `NEXT_PUBLIC_GITHUB_*` aliases).
    - `ENCRYPTION_KEY` – base64-encoded 32-byte key (e.g., `openssl rand -base64 32`).
    - Optional: `API_RATE_LIMIT_WINDOW_MS`, `API_RATE_LIMIT_MAX_REQUESTS`, `NEXT_USE_TURBOPACK`,
      `AUTOMATION_INTERVAL_MS` (ms between automation sweeps, default 5 min), `AUTOMATION_RESTART_DELAY_MS` (delay
      before respawn, default 10s), `AUTOMATION_DISABLED=1` (disable background worker).
3. **Database**
   ```bash
   npx prisma db push   # or `prisma migrate dev`
   ```
4. **Development**
   ```bash
   npm run dev  # http://localhost:3000
   ```
5. **Production**
   ```bash
   NEXT_USE_TURBOPACK=0 npm run build
   npm start
   ```

---

## 5. Authentication & Providers

- `auth.ts` configures NextAuth with the Prisma adapter and GitHub provider.
- Sessions use the `database` strategy; `session.user` is augmented with `id` and `defaultCurrency`.
- `src/app/layout.tsx` wraps the app with `<Providers>` (session + theme). Body has `min-h-screen`, `bg-background`, and
  Next font variables (Geist/Geist Mono).
- Unauthenticated visitors hitting private routes get the marketing hero (`LandingHero`) prompting GitHub sign-in.

---

## 6. Data Model (Prisma)

Core tables (see `prisma/schema.prisma`):

- `User`: default currency, encryption key version, relations to all feature tables.
- `Category`: user-scoped, name/color unique per user. Seeded via `ensureDefaultCategories`.
- `Expense` & `ExpenseGroup`: expenses store `amountEncrypted`, `impactAmountEncrypted`, `descriptionEncrypted`,
  optional `groupId`, optional `recurringSourceId`. `ExpenseGroup` holds shared title/notes/split.
- `RecurringExpense`: templates with `dueDayOfMonth`, `splitBy`, `isActive`, `lastGeneratedOn`.
- `Income` & `RecurringIncome`: parallel structure to expenses (without categories/groups).
- `MonthlyIncomeOverride`: manual adjustments per user/month.
- `ApiKey`: hashed keys with prefix, scopes, optional expiration/revocation metadata.
- NextAuth tables: `Account`, `Session`, `VerificationToken`.

Encryption helpers in `src/lib/encryption.ts` serialize payloads as Prisma JSON. All currency/description fields MUST go
through these helpers when writing to the DB.

---

## 7. Security & Compliance

1. **Encryption**: AES-256-GCM. `ENCRYPTION_KEY` must decode to 32 bytes. Helpers: `encryptString`, `encryptNumber`,
   `decrypt*`, `serializeEncrypted`, `parseEncrypted`.
2. **API Keys**: `src/lib/api-keys.ts` handles generation (`exp_<prefix>_<secret>`), hashing (bcrypt, 12 rounds), and
   verification. Keys are created via UI/API and only shown once to the user.
3. **Authentication for API routes**: `src/lib/api-auth.ts` authenticates via `x-api-key` header (scope-checked) or
   falls back to NextAuth session cookies. Also runs per-route rate limiting through `consumeToken`.
4. **Rate Limiting**: In-memory token bucket keyed by `<identifier>:<pathname>`. Defaults 120 requests/min; configurable
   via env.
5. **Middleware**: `middleware.ts` sets security headers (CSP, HSTS, frame busting, permissions policy).
6. **Data Isolation**: Every Prisma query filters by `userId`.

---

## 8. Frontend Architecture

### Layout (`DashboardShell`)

- Desktop: `div.flex` with `md:h-screen`. Sidebar `<aside>` has `md:h-screen md:max-h-screen flex-none` so it never
  exceeds 100vh. Contents (logo, nav, footer) sit inside a column with `overflow-hidden`; nav itself scrolls (
  `overflow-y-auto`).
- Collapsed state shows only hamburger button; expanded reveals branding + theme toggle.
- Right column: wrapper `div.flex-1 md:h-screen`, inner container `overflow-y-auto` so only the content scrolls while
  the page body stays fixed.
- Mobile: `aside` hidden; main area renders compact header + horizontal nav pills.

### Providers & Theming

- `ThemeProvider` stores theme in localStorage, syncs with `prefers-color-scheme`, toggled via `ThemeToggle` button (
  lucide icons).
- Tailwind config in `globals.css` defines light/dark palettes plus chart colors and radius tokens.
  `@custom-variant dark` is used to scope `.dark` styles.

### UI Library

- Minimal shadcn-derived components under `src/components/ui` (button, card, input, textarea, tabs, badge, loader).
- `cn` helper from `src/lib/utils.ts` merges class names (standard shadcn pattern).

---

## 9. Feature Modules (UI + Services)

### Dashboard (`src/app/page.tsx`)

- Server component fetches session, `getDashboardData(userId)` (which bundles latest expenses, categories, overview,
  recurring preview, cash history).
- Renders cards:
    - `MonthlyOverviewCard`: totals, income vs expenses, remaining budget.
    - `QuickStats`, `CashHistoryChart`, CTA to `/items`, and `ExpenseFeed` list.

### Expense Builder (`/items`)

- Ensures default categories, fetches categories + `getExpenseSuggestions`.
- Client component `ExpenseItemBuilder` lets users add 1–20 items, optionally group them. Form posts to
  `/api/expenses/bulk`.
- Grouping logic: first grouped item carries `groupTitle/notes/splitBy`, subsequent items inherit `groupId` once
  created.

### Analytics (`/analytics`)

- Preloads available balance series + period comparison via `analytics-service`.
- `AnalyticsDashboard` component handles preset controls, Recharts visualizations, CSV export button (hits
  `/api/export`), and comparison stats.
- `BudgetFlowSankey` visualizes category totals returned from `getMonthlyOverview`.

### Recurring Expenses (`/recurring`)

- Fetches `listRecurringExpenses` + categories, hands them to `RecurringManager`.
- Manager allows CRUD (create via `/api/recurring`, update via `/api/recurring/[id]`, toggle active via PUT, delete via
  DELETE). Services persist encrypted amounts/descriptions and handle split ratios.
- Recurring materialization: `materializeRecurringExpenses` runs before listing expenses (`listExpenses`), generating
  due instances up to current date.

### Income Planning (`/income`)

- `RecurringIncomeManager` + `IncomeManager`.
- Recurring templates stored in `recurringIncome` table (No categories/split). Materialization handled by
  `materializeRecurringIncomes`.
- Single income entries added via `/api/income` (session UI uses client actions, API clients require `income:write`
  scope).

### Categories (`/categories`)

- Lists user categories, allows CRUD via `/api/categories` (POST upsert, DELETE). Colors stored as hex strings.

### CSV Import (`/import`)

- `CsvImportForm` uploads via `FormData` to `/api/import`, selecting mode (`expenses`/`income`).
- Backend uses `csv-parse/sync`, matches headers case-insensitively, auto-creates categories on demand (
  `findOrCreateCategory`).

### API Keys (`/api-keys`)

- Server page lists existing keys (`listApiKeys`), formatting timestamps for UI.
- `ApiKeysManager` lets users generate new keys (POST `/api/api-keys`) and revoke existing ones (DELETE
  `/api/api-keys/:id`). Raw key only returned once from create response.

### API Docs (`/docs`)

- Static content summarizing endpoints, scopes, and request requirements. Pulls descriptions from
  `apiScopeDescriptions`.

### Landing (`LandingHero`)

- Marketing hero shown whenever `auth()` fails. Offers GitHub sign-in and “Learn more” button stub.

---

## 10. API Surface (HTTP)

> All endpoints expect either a valid session cookie (browser) or `x-api-key` header with appropriate scopes. Rate
> limiting applies per identifier+path.

### Expenses (`expenses:*` scopes)

- `GET /api/expenses?start&end` → `listExpenses`. Materializes recurring templates first; returns max 200 records.
- `POST /api/expenses` → `createExpense` (single).
- `POST /api/expenses/bulk` → `bulkCreateExpenses` (1–20 records, validated by `bulkExpenseSchema`).
- `GET/PATCH/DELETE /api/expenses/:id` → `getExpense`, `updateExpense`, `deleteExpense`.

### Recurring Expenses

- `GET /api/recurring` (read scope) → `listRecurringExpenses`.
- `POST /api/recurring` (write scope) → create template.
- `PATCH /api/recurring/:id` → partial update.
- `PUT /api/recurring/:id` → toggle `isActive`.
- `DELETE /api/recurring/:id`.

### Income

- `POST /api/income` → add single income entry (`income:write`).
- `GET/POST /api/income/recurring` → list/create templates (same scope).
- `PATCH/DELETE /api/income/recurring/:id`.

### Budget & Analytics

- `GET /api/budget?month=YYYY-MM` (`budget:read`) → `getMonthlyOverview`.
- `GET /api/spending?preset=month|custom&start&end` (`analytics:read`) → available balance series + period comparison.
- `GET /api/export` (`analytics:read`) → returns CSV string with header row. Accepts same preset/custom params.

### CSV Import (session auth only)

- `POST /api/import` with `FormData { mode, file }`. `mode === "income"` routes to `addIncome`; default `expenses` uses
  `createExpense`. Category lookup/creation is case-insensitive.

### Categories (session or API key)

- `GET /api/categories` (`expenses:read`) → `listCategories` (auto-seeds defaults).
- `POST /api/categories` (`expenses:write`) → `upsertCategory` (create/update based on `id`).
- `DELETE /api/categories/:id` (session only for now).

### API Keys (session auth)

- `GET /api/api-keys` → list.
- `POST /api/api-keys` → create (returns `token` + stored metadata, optional expiry).
- `DELETE /api/api-keys/:id` → soft revoke (`revokedAt` timestamp or auto-expiry).

### Auth handler

- `src/app/api/auth/[...nextauth]/route.ts` re-exports `NextAuth` handlers (GitHub OAuth flow).

---

## 11. Services Layer

All domain logic resides in `src/lib/services/*`. Each service:

- **expense-service.ts**
    - `listExpenses` (decrypts, includes category/group, enforces date filters).
    - `createExpense`, `updateExpense`, `deleteExpense`, `bulkCreateExpenses`.
    - `summarizeExpenses` (monthly totals) & `getExpenseSuggestions`.
    - Internally decrypts/encrypts amounts/descriptions and resolves groups.
- **recurring-expense-service.ts** & **recurring-income-service.ts**
    - CRUD for templates; map helpers decrypt data for UI/API responses.
- **income-service.ts**
    - `addIncome`, `listIncomeForMonth`, `getMonthlyIncomeSummary`, `getIncomeHistory`.
    - Ensures recurring incomes are materialized before queries.
- **analytics-service.ts**
    - Range utilities, available balance series, category breakdowns, spending trend (unused in UI yet), period
      comparison, CSV export.
- **dashboard-service.ts**
    - Aggregates monthly overview (expenses vs income, category totals).
    - `getDashboardData` bundles overview + categories + top recurring + cash history.
    - `getMonthlyCashHistory` builds income/expense per month for chart.
- **category-service.ts**
    - Default categories seeding, list, upsert, delete.
- **api-key-service.ts**
    - List/create/revoke API keys, returning raw token when creating.

Support libs:

- `api-auth.ts` (auth + scopes + rate limit).
- `api-keys.ts` (generate/hash/verify).
- `currency.ts`, `utils.ts` (cn helper), `validation.ts`.
- `recurring.ts` and `recurring-income.ts` handle template materialization (called before listings to ensure due records
  exist).
- `automation/automation-process.ts` + `automation-worker.ts` spawn a long-lived Node child process (via `tsx`) that
  runs materialization sweeps on an interval so recurring items post even if no user logs in. Guarded by
  `AUTOMATION_DISABLED` and `AUTOMATION_INTERVAL_MS`.

---

## 12. Background Logic & Materialization

- **Recurring expenses**: `materializeRecurringExpenses(userId)` loops templates, generates `Expense` rows for each due
  month up to `now`, dividing the impact by `splitBy`. `lastGeneratedOn` mutated after each insert. Called inside
  `listExpenses` so UI/API always see up-to-date data.
- **Recurring incomes**: Similar flow in `materializeRecurringIncomes(userId)`, invoked by income listings and
  `getMonthlyCashHistory`.
- **Automation worker**: `src/lib/automation/automation-worker.ts` iterates over every user with an active template and
  calls the same materialization helpers on a configurable interval (defaults 5 minutes). It also revokes expired API
  keys in the background. `src/lib/automation/startup.ts` ensures the worker child process spins up once per server
  instance and restarts on crashes. Tune with `AUTOMATION_INTERVAL_MS` / `AUTOMATION_RESTART_DELAY_MS`, or disable via
  `AUTOMATION_DISABLED=1`.
- Both functions clamp due days to month length (`lastDayOfMonth`) to avoid invalid dates.

---

## 13. UI Reference Components

- **Expenses**
    - `ExpenseFeed`: renders timeline-like list (uses decrypted data passed from page).
    - `ExpenseItemBuilder`: client form with grouping logic, error states, and success messaging.
- **Analytics**
    - `AnalyticsDashboard`: stateful component with filters, Recharts charts (line, bar), summary cards.
    - `BudgetFlowSankey`: uses overview category totals to render custom chart (Sankey-like).
- **Recurring**
    - `RecurringManager`: handles list display, creation dialog, and action buttons (pause/resume/delete). Talks to
      `/api/recurring`.
- **Income**
    - `RecurringIncomeManager`, `IncomeManager`: manage template and actual entries.
- **Import**
    - `CsvImportForm`: toggles between expenses/income, handles file input and result messaging.
- **API keys**
    - `ApiKeysManager`: lists tokens with prefix/usage metadata, renders human-readable scope descriptions + raw
      strings, optional expiry picker, and creation modal.
- **Landing**
    - `LandingHero`: simple CTA with GitHub sign-in button.

All components rely on shadcn-style primitives for consistent spacing, typography, and theming.

---

## 14. Styling & Theming

- Tailwind v4 `@theme inline` defines CSS custom props. Colors use `oklch`.
- Dark mode toggled by `.dark` class (body inherits from `ThemeProvider`), with mirrored palette for sidebar, charts,
  etc.
- Utility classes follow shadcn conventions (`text-muted-foreground`, `bg-card/40`, etc.).
- Root body ensures `min-h-screen`. `DashboardShell` clamps height on desktop to avoid page-level scrolling; only the
  main column scrolls (`overflow-y-auto`), satisfying the fixed sidebar requirement.

---

## 15. Testing & Verification

- No automated tests exist yet. Manual flows to verify after changes:
    1. Sign in/out via GitHub.
    2. Add expenses (single + grouped), ensure feed + analytics update.
    3. Create recurring expense/income, reload to confirm materialization.
    4. Import CSV sample for expenses/income, verify new rows and auto-created categories.
    5. Generate API key, call a scoped endpoint with `x-api-key`.
    6. Hit rate limit by spamming endpoint; expect 429 with `Retry-After`.
    7. Toggle dark mode, ensure theme persists.
    8. Resize viewport >1024px: sidebar stays exactly 100vh, only right pane scrolls.
    9. Create an API key with a near-future expiry and confirm the automation worker revokes it.

---

## 16. Rebuild Checklist

1. Scaffold Next.js App Router + Tailwind v4 project.
2. Copy Prisma schema; run migrations (`npx prisma migrate dev`).
3. Implement `auth.ts` + NextAuth route, configure GitHub OAuth & database sessions.
4. Create encryption, API key, rate limit, and recurring helpers (`src/lib/*`).
5. Build services mirroring `src/lib/services`.
6. Implement API routes exactly as under `src/app/api/*`, respecting scopes and validation.
7. Port UI components, ensuring `DashboardShell` layout + ThemeProvider integration.
8. Stitch pages: dashboard, items, analytics, recurring, income, categories, import, api-keys, docs.
9. Set up default categories and ensure they’re created per user.
10. Verify flows listed in §15.

Following this guide, another agent can reproduce the entire Expense Flow application, maintain feature equivalence, and
understand how subsystems connect end to end.
