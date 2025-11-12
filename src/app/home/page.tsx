import {redirect} from "next/navigation"
import {format, parseISO} from "date-fns"
import Link from "next/link"
import {auth} from "@/lib/auth-server"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {getDailySummary} from "@/lib/services/summary-service"
import {DailySummaryBoard} from "@/components/main/daily-summary-board"
import {SummaryList} from "@/components/main/summary-list"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {FeatureHint} from "@/components/feature-hint"
import {Button} from "@/components/ui/button"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {GuidedSteps} from "@/components/guided-steps"
import {OnboardingChecklist} from "@/components/dashboard/onboarding-checklist"
import {getDashboardData} from "@/lib/services/dashboard-service"

export const dynamic = "force-dynamic"

export default async function HomePage() {
    const session = await auth()
    if (!session?.user) redirect("/")

    requireOnboardingCompletion(session)

    const [summary, dashboard] = await Promise.all([
        getDailySummary(session.user.id),
        getDashboardData(session.user.id),
    ])
    const currency = session.user.defaultCurrency

    const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    })

    const expenseItems = summary.expenses.map((expense) => {
        const differs = Math.abs(expense.amount - expense.impactAmount) > 0.005
        const metaParts: string[] = []
        if (differs) {
            metaParts.push(`of ${formatter.format(expense.amount)} total`)
        }
        if (expense.splitBy && expense.splitBy > 1) {
            metaParts.push(`${expense.splitBy}-way split`)
        }
        return {
            id: expense.id,
            title: expense.description || "Untitled expense",
            subtitle: expense.category ?? "Uncategorized",
            amount: formatter.format(expense.impactAmount),
            meta: metaParts.length ? metaParts.join(" · ") : undefined,
        }
    })

    const incomeItems = summary.incomes.map((income) => ({
        id: income.id,
        title: income.description || "Income",
        subtitle: "Recorded today",
        amount: formatter.format(income.amount),
        meta: format(parseISO(income.occurredOn), "HH:mm"),
    }))

    const upcomingItems = summary.upcomingRecurring.map((template) => ({
        id: template.id,
        title: template.description,
        subtitle: template.categoryId ? "Categorized template" : "Uncategorized",
        amount: formatter.format(template.amount),
        meta: `Due day ${template.dueDayOfMonth}`,
    }))

    const checklist = [
        {
            id: "expense",
            label: "Record your first expense",
            description: "Use the bulk builder to log a transaction",
            href: "/items",
            completed: dashboard.recentExpenses.length > 0,
        },
        {
            id: "recurring",
            label: "Automate a recurring expense",
            description: "Templates keep fixed costs in sync",
            href: "/recurring",
            completed: dashboard.recurringExpenses.length > 0,
        },
        {
            id: "api",
            label: "Generate an API key",
            description: "Script imports or integrate automations",
            href: "/api-keys",
            completed: dashboard.apiKeyCount > 0,
        },
    ]

    return (
        <DashboardShell
            heading="Home"
            description="Your daily pulse plus a Shortcut-ready summary endpoint."
            user={session.user}
            actions={
                <div className="hidden sm:block">
                    <FeatureHint
                        label="Need to update?"
                        description="Use the bulk builder to add more entries before refreshing this snapshot."
                    >
                        <Button asChild size="sm">
                            <Link href="/items">Add entries</Link>
                        </Button>
                    </FeatureHint>
                </div>
            }
        >
            <div className="space-y-6">
                <GuidedSteps
                    storageKey="home-guided"
                    steps={[
                        {
                            title: "Refresh the snapshot",
                            description: "Revisit this view after logging expenses to see updated totals instantly.",
                        },
                        {
                            title: "Scan the lists",
                            description: "Use the expense/income panels to confirm what cleared today.",
                        },
                        {
                            title: "Automate the summary",
                            description: "Wire the /api/summary endpoint into Shortcuts for on-demand briefings.",
                        },
                    ]}
                />

                <OnboardingChecklist items={checklist}/>

                <DailySummaryBoard summary={summary} currency={currency}/>

                <div className="grid gap-6 lg:grid-cols-3">
                    <SummaryList
                        title="Today's expenses"
                        description="Highest impact entries logged today."
                        emptyLabel="No expenses yet today."
                        items={expenseItems}
                    />
                    <SummaryList
                        title="Today's income"
                        description="Income entries powering the net view."
                        emptyLabel="No income yet today."
                        items={incomeItems}
                    />
                    <SummaryList
                        title="Upcoming recurring costs"
                        description="Next active templates in the queue."
                        emptyLabel="No recurring templates configured."
                        items={upcomingItems}
                    />
                </div>

                <Card className="rounded-3xl border-dashed">
                    <CardHeader>
                        <CardTitle>Daily summary API</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Call this endpoint from Shortcuts, Zapier, or a cron job to fetch the same data powering
                            this page.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>
                            <code>GET /api/summary?date=YYYY-MM-DD</code> requires the{" "}
                            <strong>analytics:read</strong> scope. Responses include totals, today's expenses/income,
                            and the next recurring templates.
                        </p>
                        <pre className="rounded-2xl border bg-muted/40 p-3 text-xs font-mono text-foreground/90">
{`curl https://your-domain.com/api/summary?date=${summary.date} \\
  -H "x-api-key: exp_prefix_secret"`}
            </pre>
                        <p className="text-muted-foreground">
                            The `date` parameter is optional; omit it to default to today. Shortcut actions can hit
                            this endpoint and announce the totals aloud.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    )
}
