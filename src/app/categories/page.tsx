import {auth} from "@/lib/auth-server"
import {redirect} from "next/navigation"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {ensureDefaultCategories, listCategories,} from "@/lib/services/category-service"
import {CategoryManager} from "@/components/categories/category-manager"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {GuidedSteps} from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
    const session = await auth()
    if (!session?.user) redirect("/")

    requireOnboardingCompletion(session)

    await ensureDefaultCategories(session.user.id)
    const categories = await listCategories(session.user.id)

    return (
        <DashboardShell
            heading="Categories"
            description="Color-code spend buckets for analytics."
            user={session.user}
        >
            <GuidedSteps
                storageKey="categories-guided"
                steps={[
                    {
                        title: "Review defaults",
                        description: "We auto-seed essentials; rename or tweak colors to match your language.",
                    },
                    {
                        title: "Keep names unique",
                        description: "Names are unique per user so analytics stay tidy and CSV import auto-maps.",
                    },
                    {
                        title: "Delete with care",
                        description: "Removing a category keeps expenses but reverts them to uncategorized.",
                    },
                ]}
            />
            <CategoryManager categories={categories}/>
        </DashboardShell>
    )
}
