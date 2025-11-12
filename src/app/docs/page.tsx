import {auth} from "@/lib/auth-server"
import {redirect} from "next/navigation"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {cn} from "@/lib/utils"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {GuidedSteps} from "@/components/guided-steps"

type Endpoint = {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    path: string
    scope: string
    description: string
    query?: string
    request?: string
    response?: string
}

type EndpointGroup = {
    title: string
    description: string
    endpoints: Endpoint[]
}

const methodColors: Record<string, string> = {
    GET: "bg-sky-500/15 text-sky-600 dark:text-sky-300 dark:bg-sky-500/20",
    POST: "bg-sky-500/15 text-sky-600 dark:text-sky-300 dark:bg-sky-500/20",
    PUT: "bg-sky-500/15 text-sky-600 dark:text-sky-300 dark:bg-sky-500/20",
    PATCH: "bg-sky-500/15 text-sky-600 dark:text-sky-300 dark:bg-sky-500/20",
    DELETE: "bg-sky-500/15 text-sky-600 dark:text-sky-300 dark:bg-sky-500/20",
}

const endpointGroups: EndpointGroup[] = [
    {
        title: "Expenses",
        description: "Encrypted expense CRUD plus helper endpoints (`expenses:*`).",
        endpoints: [
            {
                method: "GET",
                path: "/api/expenses?start&end",
                scope: "expenses:read",
                description: "List decrypted expenses (max 200, newest first).",
                query: "`start`, `end` ISO date strings (optional).",
                response: `{
  expenses: Array<{
    id: string
    occurredOn: string
    amount: number
    impactAmount: number
    splitBy?: number | null
    description: string
    categoryId: string | null
    recurringSourceId?: string | null
  }>
}`,
            },
            {
                method: "POST",
                path: "/api/expenses",
                scope: "expenses:write",
                description: "Create a single expense.",
                request: `{
  occurredOn: string // ISO date
  amount: number
  impactAmount?: number
  splitBy?: number
  description: string
  categoryId?: string
}`,
                response: `{
  id: string
  occurredOn: string
  amount: number
  impactAmount: number
  splitBy?: number | null
  description: string
  categoryId: string | null
  recurringSourceId?: string | null
}`,
            },
            {
                method: "POST",
                path: "/api/expenses/bulk",
                scope: "expenses:write",
                description: "Submit 1–20 expenses in one request.",
                request: `{
  items: Array<{
    occurredOn: string
    amount: number
    impactAmount?: number
    splitBy?: number
    description: string
    categoryId?: string
  }>
  group?: {
    title: string
    notes?: string
    splitBy?: number
  }
}`,
                response: `Array<{
  id: string
  occurredOn: string
  amount: number
  impactAmount: number
  description: string
  categoryId: string | null
  recurringSourceId?: string | null
}>`,
            },
            {
                method: "PATCH",
                path: "/api/expenses/:id",
                scope: "expenses:write",
                description: "Partial update for an expense.",
                request: `{
  occurredOn?: string
  amount?: number
  impactAmount?: number
  splitBy?: number
  description?: string
  categoryId?: string
}`,
                response: `{
  id: string
  occurredOn: string
  amount: number
  impactAmount: number
  splitBy?: number | null
  description: string
  categoryId: string | null
  recurringSourceId?: string | null
}`,
            },
            {
                method: "DELETE",
                path: "/api/expenses/:id",
                scope: "expenses:write",
                description: "Remove an expense.",
            },
            {
                method: "GET",
                path: "/api/expenses/:id",
                scope: "expenses:read",
                description: "Fetch a single expense.",
                response: `{
  id: string
  occurredOn: string
  amount: number
  impactAmount: number
  splitBy?: number | null
  description: string
  categoryId: string | null
  recurringSourceId?: string | null
}`,
            },
            {
                method: "GET",
                path: "/api/expenses/suggest-category",
                scope: "expenses:read",
                description: "Return best-fit category hint based on description text.",
                query: "`description` (string, required).",
                response: `{
  suggestion?: {
    categoryId: string
    categoryName: string
    score: number
  }
}`,
            },
        ],
    },
    {
        title: "Categories",
        description: "User-scoped categories share the same `expenses:*` scopes.",
        endpoints: [
            {
                method: "GET",
                path: "/api/categories",
                scope: "expenses:read",
                description: "List categories (default set auto-seeds on first call).",
                response: `{
  categories: Array<{
    id: string
    name: string
    color: string
  }>
}`,
            },
            {
                method: "POST",
                path: "/api/categories",
                scope: "expenses:write",
                description: "Create or update a category.",
                request: `{
  id?: string
  name: string
  color: string
}`,
            },
            {
                method: "DELETE",
                path: "/api/categories/:id",
                scope: "expenses:write",
                description: "Delete a category (expenses fall back to uncategorized).",
            },
        ],
    },
    {
        title: "Recurring expenses",
        description: "Template endpoints that auto-materialize expenses (when a month is shorter than the chosen day, posting occurs on that month’s final day).",
        endpoints: [
            {
                method: "GET",
                path: "/api/recurring",
                scope: "expenses:read",
                description: "List recurring expense templates.",
                response: `{
  templates: Array<{
  id: string
  description: string
  amount: number
  dueDayOfMonth: number
  splitBy: number
  isActive: boolean
  categoryId: string | null
  }>
}`,
            },
            {
                method: "POST",
                path: "/api/recurring",
                scope: "expenses:write",
                description: "Create a recurring expense template.",
                request: `{
  description: string
  amount: number
  dueDayOfMonth: number // 1-31
  splitBy?: number
  categoryId?: string
}`,
            },
            {
                method: "PUT",
                path: "/api/recurring/:id",
                scope: "expenses:write",
                description: "Toggle template active state.",
            },
            {
                method: "PATCH",
                path: "/api/recurring/:id",
                scope: "expenses:write",
                description: "Partial update for a template.",
                request: `{
  description?: string
  amount?: number
  dueDayOfMonth?: number
  splitBy?: number
  categoryId?: string
  isActive?: boolean
}`,
                response: `{
  id: string
  description: string
  amount: number
  dueDayOfMonth: number
  splitBy: number
  isActive: boolean
  categoryId: string | null
}`,
            },
            {
                method: "DELETE",
                path: "/api/recurring/:id",
                scope: "expenses:write",
                description: "Delete a recurring template.",
            },
        ],
    },
    {
        title: "Income",
        description: "Single and recurring income endpoints (`income:write`). Recurring templates follow the same “use the last day when shorter” rule as expenses.",
        endpoints: [
            {
                method: "POST",
                path: "/api/income",
                scope: "income:write",
                description: "Record an income entry.",
                request: `{
  description: string
  amount: number
  occurredOn: string
}`,
            },
            {
                method: "PATCH",
                path: "/api/income/:id",
                scope: "income:write",
                description: "Update description, amount, or date of a single income entry.",
                request: `{
  description?: string
  amount?: number
  occurredOn?: string
}`,
            },
            {
                method: "DELETE",
                path: "/api/income/:id",
                scope: "income:write",
                description: "Delete a single income entry.",
            },
            {
                method: "GET",
                path: "/api/income/recurring",
                scope: "income:write",
                description: "List recurring income templates.",
                response: `{
  templates: Array<{
  id: string
  description: string
  amount: number
  dueDayOfMonth: number
  isActive: boolean
  }>
}`,
            },
            {
                method: "POST",
                path: "/api/income/recurring",
                scope: "income:write",
                description: "Create a recurring income template.",
                request: `{
  description: string
  amount: number
  dueDayOfMonth: number // 1-31
}`,
            },
            {
                method: "PATCH",
                path: "/api/income/recurring/:id",
                scope: "income:write",
                description: "Update a recurring income template.",
                request: `{
  description?: string
  amount?: number
  dueDayOfMonth?: number
  isActive?: boolean
}`,
                response: `{
  id: string
  description: string
  amount: number
  dueDayOfMonth: number
  isActive: boolean
}`,
            },
            {
                method: "DELETE",
                path: "/api/income/recurring/:id",
                scope: "income:write",
                description: "Delete a recurring income template.",
            },
        ],
    },
    {
        title: "Analytics & reporting",
        description:
            "Read-only endpoints used by dashboards (`analytics:read`, `budget:read`).",
        endpoints: [
            {
                method: "GET",
                path: "/api/spending?preset",
                scope: "analytics:read",
                description: "Balance series plus comparison deltas.",
                query: "`preset=month|3m|6m|12m|ytd|custom`, `start`, `end` (ISO).",
                response: `{
  series: {
    range: {
      preset: "month" | "3m" | "6m" | "12m" | "ytd" | "custom"
      start: string
      end: string
    }
    series: Array<{
      key: string
      label: string
      income: number
      expenses: number
      balance: number
    }>
  }
  comparison: {
    current: {
      totalIncome: number
      totalExpenses: number
      remainingBudget: number
    }
    previous: {
      totalIncome: number
      totalExpenses: number
      remainingBudget: number
    }
    deltas: {
      income: number
      expenses: number
      remaining: number
    }
  }
}`,
            },
            {
                method: "GET",
                path: "/api/budget?month=YYYY-MM",
                scope: "budget:read",
                description: "Monthly overview totals and remaining budget.",
                response: `{
  start: string
  end: string
  totalIncome: number
  totalExpenses: number
  remainingBudget: number
  categoryTotals: Array<{
    id: string
    label: string
    color: string
    value: number
  }>
}`,
            },
            {
                method: "GET",
                path: "/api/feed",
                scope: "analytics:read",
                description: "Chronological feed of expenses, income, automations.",
                response: `{
  feed: Array<{
    id: string
    type:
      | "expense"
      | "expense-group"
      | "income"
      | "recurring-expense"
      | "recurring-income"
      | "api-key"
      | "import-schedule"
    title: string
    subtitle?: string
    timestamp: string
    amount?: number
    category?: string
    items?: Array<{
      id: string
      title: string
      category?: string
      amount?: number
    }>
  }>
}`,
            },
            {
                method: "GET",
                path: "/api/analytics/forecast",
                scope: "analytics:read",
                description: "Actual vs projected net cash.",
                query: "`months?`, `horizon?` (numbers, optional).",
                response: `{
  history: Array<{
    key: string
    label: string
    income: number
    expenses: number
    balance: number
    net: number
  }>
  forecast: Array<{
    key: string
    label: string
    forecast: number
  }>
}`,
            },
            {
                method: "GET",
                path: "/api/analytics/anomalies",
                scope: "analytics:read",
                description: "Category z-score anomalies for a month.",
                query: "`months?` (defaults to 12).",
                response: `{
  anomalies: Array<{
  categoryId: string
  categoryLabel: string
  current: number
  mean: number
  std: number
  zScore: number
  }>
}`,
            },
            {
                method: "GET",
                path: "/api/analytics/category-health",
                scope: "analytics:read",
                description: "Category share vs baseline stats.",
                query: "`month=YYYY-MM?`, `baselineMonths?` (defaults to 6).",
                response: `{
  health: Array<{
  categoryId: string
  label: string
  color: string
  actual: number
  baseline: number
  delta: number
  status: "over" | "under"
  }>
}`,
            },
            {
                method: "GET",
                path: "/api/analytics/income-flow",
                scope: "analytics:read",
                description: "Sankey nodes/links describing income allocation.",
                query: "`month=YYYY-MM?`.",
                response: `{
  nodes: Array<{ name: string; color?: string }>
  links: Array<{ source: number; target: number; value: number }>
  totalIncome: number
  totalExpenses: number
  recurringIncome: number
  oneTimeIncome: number
}`,
            },
            {
                method: "POST",
                path: "/api/analytics/scenario",
                scope: "analytics:read",
                description: "Budget simulation deltas.",
                request: `{
  incomeDelta?: number
  expenseDelta?: number
  categoryOverrides?: Array<{
    categoryId: string
    delta: number
  }>
}`,
            },
            {
                method: "GET",
                path: "/api/export",
                scope: "analytics:read",
                description: "CSV export of the balance series (text/csv).",
                query: "Same params as `/api/spending`.",
                response: "`string` // CSV payload",
            },
            {
                method: "GET",
                path: "/api/summary?date",
                scope: "analytics:read",
                description: "Daily summary totals, entries, and upcoming recurring templates.",
                query: "`date=YYYY-MM-DD` (optional, defaults to today).",
                response: `{
  currency: string
  summary: {
    date: string
    totals: {
      expenses: number
      income: number
      net: number
    }
    expenses: Array<{
      id: string
      occurredOn: string
      description: string
      amount: number
      impactAmount: number
      splitBy?: number | null
      category: string | null
      categoryColor: string | null
    }>
    incomes: Array<{
      id: string
      occurredOn: string
      description: string
      amount: number
    }>
    upcomingRecurring: Array<{
      id: string
      description: string
      amount: number
      dueDayOfMonth: number
      categoryId?: string | null
    }>
    trend: Array<{
      id: string
      occurredOn: string
      impactAmount: number
    }>
  }
}`,
            },
        ],
    },
    {
        title: "API keys (dashboard only)",
        description: "Manage scoped tokens via a signed-in browser session.",
        endpoints: [
            {
                method: "GET",
                path: "/api/api-keys",
                scope: "session",
                description: "List existing API keys (secrets are never returned).",
                response: `{
  keys: Array<{
    id: string
    prefix: string
    scopes: string[]
    description?: string | null
    expiresAt?: string | null
    revokedAt?: string | null
    createdAt: string
  }>
}`,
            },
            {
                method: "POST",
                path: "/api/api-keys",
                scope: "session",
                description: "Create a new API key and return the raw token once.",
                request: `{
  description?: string
  scopes: string[] // e.g. ["expenses:read", "analytics:read"]
  expiresAt?: string
}`,
                response: `{
  token: string
  record: {
    id: string
    prefix: string
    scopes: string[]
    description?: string | null
    expiresAt?: string | null
    revokedAt?: string | null
    createdAt: string
  }
}`,
            },
            {
                method: "DELETE",
                path: "/api/api-keys/:id",
                scope: "session",
                description: "Revoke or delete an API key by id.",
                response: `{
  ok: boolean
  action: "revoked" | "deleted"
}`,
            },
        ],
    },
    {
        title: "CSV import & schedules",
        description: "Upload files or manage background import automations (session only).",
        endpoints: [
            {
                method: "POST",
                path: "/api/import",
                scope: "session",
                description: "Upload a CSV file and import rows immediately.",
                request: "multipart/form-data { file: File, mode?: expenses|income, template?: string }",
                response: `{
  imported: number
}`,
            },
            {
                method: "POST",
                path: "/api/import/preview",
                scope: "session",
                description: "Preview the first 50 normalized rows before importing.",
                request: "multipart/form-data { file: File, mode?: expenses|income, template?: string }",
                response: `{
  rows: Array<{
    id: string
    date: string
    description: string
    category: string
    amount: number
    impactAmount?: number
  }>
}`,
            },
            {
                method: "POST",
                path: "/api/import/rows",
                scope: "session",
                description: "Send structured JSON rows instead of uploading a CSV.",
                request: `{
  mode?: "expenses" | "income"
  rows: Array<{
    date: string
    description: string
    amount: number
    impactAmount?: number
    category?: string
    categoryId?: string
  }>
}`,
                response: `{
  imported: number
}`,
            },
            {
                method: "GET",
                path: "/api/import/schedules",
                scope: "session",
                description: "List saved import schedules.",
                response: `{
  schedules: Array<{
    id: string
    name: string
    mode: "expenses" | "income"
    template: string
    frequency: "weekly" | "biweekly" | "monthly" | "quarterly"
    sourceUrl?: string | null
    lastRunAt?: string | null
    nextRunAt?: string | null
    createdAt: string
  }>
}`,
            },
            {
                method: "POST",
                path: "/api/import/schedules",
                scope: "session",
                description: "Create a schedule that periodically fetches and imports CSV data.",
                request: `{
  name: string
  mode: "expenses" | "income"
  template?: string
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly"
  sourceUrl?: string
}`,
                response: `{
  schedule: {
    id: string
    name: string
    mode: "expenses" | "income"
    template: string
    frequency: "weekly" | "biweekly" | "monthly" | "quarterly"
    sourceUrl?: string | null
    nextRunAt?: string | null
  }
}`,
            },
            {
                method: "PATCH",
                path: "/api/import/schedules/:id",
                scope: "session",
                description: "Update schedule metadata or frequency.",
                request: `{
  name?: string
  mode?: "expenses" | "income"
  template?: string
  frequency?: "weekly" | "biweekly" | "monthly" | "quarterly"
  sourceUrl?: string
}`,
                response: `{
  schedule: {
    id: string
    name: string
    mode: "expenses" | "income"
    template: string
    frequency: "weekly" | "biweekly" | "monthly" | "quarterly"
    sourceUrl?: string | null
    nextRunAt?: string | null
  }
}`,
            },
            {
                method: "DELETE",
                path: "/api/import/schedules/:id",
                scope: "session",
                description: "Delete a saved schedule.",
                response: `{
  success: boolean
}`,
            },
            {
                method: "POST",
                path: "/api/import/schedules/:id/run",
                scope: "session",
                description: "Mark a schedule run complete and compute the next run timestamp.",
                response: `{
  schedule: {
    id: string
    lastRunAt?: string | null
    nextRunAt?: string | null
  }
}`,
            },
        ],
    },
    {
        title: "Settings",
        description: "Session-only preferences for the signed-in user.",
        endpoints: [
            {
                method: "PATCH",
                path: "/api/settings",
                scope: "session",
                description: "Update currency, accent color, or onboarding flag.",
                request: `{
  defaultCurrency?: string // ISO currency code
  accentColor?: string // hex
  onboardingCompleted?: boolean
}`,
                response: `{
  settings: {
    id: string
    defaultCurrency: string
    accentColor?: string | null
    onboardingCompleted: boolean
  }
}`,
            },
            {
                method: "DELETE",
                path: "/api/settings",
                scope: "session",
                description: "Delete your entire account and all associated data.",
                response: `{
  ok: boolean
}`,
            },
        ],
    },
]

export const dynamic = "force-dynamic"

export default async function DocsPage() {
    const session = await auth()
    if (!session?.user) redirect("/")
    requireOnboardingCompletion(session)

    return (
        <DashboardShell
            heading="API docs"
            description="Scopes, headers, and endpoints for integrating Expense Flow."
            user={session.user}
        >
            <GuidedSteps
                storageKey="docs-guided"
                steps={[
                    {
                        title: "Authenticate first",
                        description: "Use session cookies in-browser or scoped API keys with the x-api-key header.",
                    },
                    {
                        title: "Pick the scope",
                        description: "Match each endpoint to a scope so least-privilege API keys stay tight.",
                    },
                    {
                        title: "Prototype quickly",
                        description: "Copy request/response snippets into Thunder Client, Postman, or curl.",
                    },
                ]}
            />
            <Card className="rounded-3xl">
                <CardHeader>
                    <CardTitle>Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>
                        Supply either a session cookie (browser) or an <code>x-api-key</code>{" "}
                        header with a scoped token. Rate limits: 120 requests per minute per
                        user or key + path combination. Expect HTTP 429 with{" "}
                        <code>Retry-After</code> when throttled.
                    </p>
                    <p>
                        API keys are formatted as <code>exp_prefix_secret</code>. Secrets
                        are hashed with bcrypt and never stored in plaintext. Revoke a key
                        directly from the dashboard to invalidate immediately.
                    </p>
                    <p>
                        Available scopes: <code>expenses:read</code>,{" "}
                        <code>expenses:write</code>, <code>income:write</code>,{" "}
                        <code>analytics:read</code>, <code>budget:read</code>. Errors return{" "}
                        <code>{`{ error: string }`}</code> with appropriate HTTP status codes.
                    </p>
                </CardContent>
            </Card>

            {endpointGroups.map((group) => (
                <Card key={group.title} className="rounded-3xl">
                    <CardHeader>
                        <CardTitle>{group.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {group.endpoints.map((endpoint) => (
                            <div
                                key={`${endpoint.method}-${endpoint.path}`}
                                className="rounded-2xl border px-4 py-3 text-sm"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        className={cn(
                                            "uppercase tracking-wide",
                                            methodColors[endpoint.method] ?? "bg-muted text-foreground"
                                        )}
                                    >
                                        {endpoint.method}
                                    </Badge>
                                    <code className="text-xs">{endpoint.path}</code>
                                    <Badge variant="outline">{endpoint.scope}</Badge>
                                </div>
                                <p className="mt-2 text-muted-foreground">{endpoint.description}</p>
                                {endpoint.query ? (
                                    <SectionLine label="Query">{endpoint.query}</SectionLine>
                                ) : null}
                                {endpoint.request ? (
                                    <CodeBlock title="Request">{endpoint.request}</CodeBlock>
                                ) : null}
                                {endpoint.response ? (
                                    <CodeBlock title="Response">{endpoint.response}</CodeBlock>
                                ) : null}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </DashboardShell>
    )
}

function SectionLine({
                         label,
                         children,
                     }: {
    label: string
    children: React.ReactNode
}) {
    return (
        <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{label}: </span>
            {children}
        </p>
    )
}

function CodeBlock({
                       title,
                       children,
                   }: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div className="mt-2 space-y-1 rounded-2xl border bg-muted/40 p-3 text-xs font-mono text-foreground/90">
            <p className="font-semibold text-foreground">{title}</p>
            <pre className="whitespace-pre-wrap leading-relaxed">{children}</pre>
        </div>
    )
}
