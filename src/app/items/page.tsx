import {auth} from "@/lib/auth-server"
import {redirect} from "next/navigation"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {ensureDefaultCategories, listCategories} from "@/lib/services/category-service"
import {getExpenseSuggestions} from "@/lib/services/expense-service"
import {ExpenseItemBuilder} from "@/components/expenses/expense-item-builder"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {GuidedSteps} from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function ItemsPage() {
    const session = await auth()
    if (!session?.user) {
        redirect("/")
    }

    requireOnboardingCompletion(session)

    await ensureDefaultCategories(session.user.id)
    const [categories, suggestions] = await Promise.all([
        listCategories(session.user.id),
        getExpenseSuggestions(session.user.id, 5),
    ])

    return (
        <DashboardShell
            heading="Expense builder"
            description="Capture multiple transactions, group notes, and auto categorize."
            user={session.user}
        >
            <GuidedSteps
                storageKey="items-guided"
                steps={[
                    {
                        title: "Batch your entries",
                        description: "Add up to 20 items at once; each row captures date, amount, and category.",
                    },
                    {
                        title: "Use groups",
                        description: "Toggle grouping to share notes/splits across a batch (ideal for receipts).",
                    },
                    {
                        title: "Submit & repeat",
                        description: "Create the batch, then leverage suggestions for faster follow-up entries.",
                    },
                ]}
            />
            <ExpenseItemBuilder categories={categories} suggestions={suggestions}/>
        </DashboardShell>
    )
}
