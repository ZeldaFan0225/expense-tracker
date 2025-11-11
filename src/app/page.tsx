import Link from "next/link"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth-server"
import { LandingHero } from "@/components/landing-hero"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getDashboardData } from "@/lib/services/dashboard-service"
import { MonthlyOverviewCard } from "@/components/dashboard/monthly-overview-card"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { CashHistoryChart } from "@/components/dashboard/cash-history-chart"
import { ExpenseFeed } from "@/components/dashboard/expense-feed"
import { FeatureHint } from "@/components/feature-hint"
import { requireOnboardingCompletion } from "@/lib/onboarding"
import { GuidedSteps } from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    return <LandingHero />
  }

  requireOnboardingCompletion(session)

  const dashboard = await getDashboardData(session.user.id)
  return (
    <DashboardShell
      heading="Unified dashboard"
      description="Encrypted expenses, recurring income, and API insights."
      user={session.user}
      actions={
        <FeatureHint
          label="Bulk item builder"
          description="Jump straight into the multi-add builder to log up to 20 expenses at once."
        >
          <Button asChild size="sm">
            <Link href="/items">New expense</Link>
          </Button>
        </FeatureHint>
      }
    >
      <GuidedSteps
        storageKey="dashboard-guided"
        steps={[
          {
            title: "Review the overview",
            description: "Start with the monthly overview to see remaining budget and recent deltas.",
          },
          {
            title: "Log expenses quickly",
            description: "Use the New expense action or the /items builder to keep data flowing.",
          },
          {
            title: "Inspect the feed",
            description: "Scroll the right column to verify that new entries and automations landed.",
          },
        ]}
      />
      <MonthlyOverviewCard
        overview={dashboard.overview}
        currency={session.user.defaultCurrency}
      />

      <QuickStats
        stats={[
          {
            label: "Active templates",
            value: `${dashboard.recurringExpenses.length}`,
            hint: "Recurring expenses ready to auto-post",
          },
          {
            label: "Categories",
            value: `${dashboard.categories.length}`,
            hint: "Custom color-coded buckets",
          },
          {
            label: "Cash history",
            value: `${dashboard.cashHistory.length} months`,
            hint: "Tracked in analytics",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CashHistoryChart
          data={dashboard.cashHistory}
          currency={session.user.defaultCurrency}
        />
        <ExpenseFeed
          expenses={dashboard.recentExpenses}
          currency={session.user.defaultCurrency}
        />
      </div>
    </DashboardShell>
  )
}
