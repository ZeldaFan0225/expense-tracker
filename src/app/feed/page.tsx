import {redirect} from "next/navigation"
import {auth} from "@/lib/auth-server"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {getFinancialActivityFeed} from "@/lib/services/feed-service"
import {FeedTimeline} from "@/components/feed/feed-timeline"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {GuidedSteps} from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function FeedPage() {
    const session = await auth()
    if (!session?.user) redirect("/")

    requireOnboardingCompletion(session)

    const feed = await getFinancialActivityFeed(session.user.id)

    return (
        <DashboardShell
            heading="Financial feed"
            description="Chronological log of expenses, income, and other cash-impacting events."
            user={session.user}
        >
            <GuidedSteps
                storageKey="feed-guided"
                steps={[
                    {
                        title: "Scan recent entries",
                        description: "Use the feed to confirm the latest expenses, income, and automation posts.",
                    },
                    {
                        title: "Filter by currency",
                        description: "Switch your default currency in settings to change formatting everywhere.",
                    },
                    {
                        title: "Jump to source",
                        description: "Each feed item links back to its origin so you can edit or delete quickly.",
                    },
                ]}
            />
            <FeedTimeline
                feed={feed}
                currency={session.user.defaultCurrency}
                title="Financial activity"
                description="Expenses, income, and other ledger entries."
                emptyState="No financial activity yet. Add an expense or income entry to get started."
            />
        </DashboardShell>
    )
}
