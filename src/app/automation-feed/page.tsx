import {redirect} from "next/navigation"

import {auth} from "@/lib/auth-server"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {FeedTimeline} from "@/components/feed/feed-timeline"
import {getAutomationActivityFeed} from "@/lib/services/feed-service"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {GuidedSteps} from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function AutomationFeedPage() {
    const session = await auth()
    if (!session?.user) redirect("/")

    requireOnboardingCompletion(session)

    const feed = await getAutomationActivityFeed(session.user.id)

    return (
        <DashboardShell
            heading="Automation feed"
            description="Keep tabs on API keys, recurring templates, and import schedules."
            user={session.user}
        >
            <GuidedSteps
                storageKey="automation-feed-guided"
                steps={[
                    {
                        title: "Watch recurring posts",
                        description: "Templates log each generated expense or income so you can audit timing.",
                    },
                    {
                        title: "Track API keys",
                        description: "Key creations, deletions, and expirations show up here with timestamps.",
                    },
                    {
                        title: "Monitor schedules",
                        description: "Import schedule runs highlight success or errors so you can intervene early.",
                    },
                ]}
            />
            <FeedTimeline
                feed={feed}
                currency={session.user.defaultCurrency}
                title="Automation activity"
                description="API keys, recurring templates, and import schedules in chronological order."
                emptyState="No automation events yet. Create an API key or schedule to populate this feed."
            />
        </DashboardShell>
    )
}
