import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import {
  getAvailableBalanceSeries,
  getPeriodComparison,
  getForecast,
  detectSpendingAnomalies,
  getCategoryHealth,
  getIncomeFlowGraph,
} from "@/lib/services/analytics-service"
import { listCategories } from "@/lib/services/category-service"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { requireOnboardingCompletion } from "@/lib/onboarding"
import { GuidedSteps } from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  requireOnboardingCompletion(session)

  const [series, comparison, forecast, anomalies, categoryHealth, incomeFlow, categories] =
    await Promise.all([
      getAvailableBalanceSeries(session.user.id),
      getPeriodComparison(session.user.id),
      getForecast(session.user.id),
      detectSpendingAnomalies(session.user.id),
      getCategoryHealth(session.user.id),
      getIncomeFlowGraph(session.user.id),
      listCategories(session.user.id),
    ])

  return (
    <DashboardShell
      heading="Analytics"
      description="Trend cash flow, compare months, and export CSV."
      user={session.user}
    >
      <GuidedSteps
        storageKey="analytics-guided"
        steps={[
          {
            title: "Pick a range",
            description: "Use presets or set custom dates to focus on the right timeframe.",
          },
          {
            title: "Inspect anomalies",
            description: "Use the anomaly and category health panels to spot spikes early.",
          },
          {
            title: "Export or automate",
            description: "Download CSVs or call /api/summary for Shortcut-friendly data.",
          },
        ]}
      />
      <AnalyticsDashboard
        initialSeries={series.series}
        initialComparison={comparison}
        initialForecast={forecast}
        initialAnomalies={anomalies}
        initialCategoryHealth={categoryHealth}
        initialIncomeFlow={incomeFlow}
        categories={categories}
        currency={session.user.defaultCurrency}
      />
    </DashboardShell>
  )
}
