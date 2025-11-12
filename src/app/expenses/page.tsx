import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ExpenseList } from "@/components/expenses/expense-list"
import { getExpenseSuggestions, listExpenses } from "@/lib/services/expense-service"
import { listCategories } from "@/lib/services/category-service"
import { requireOnboardingCompletion } from "@/lib/onboarding"

export const dynamic = "force-dynamic"

export default async function ExpensesPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  requireOnboardingCompletion(session)

  const [expensesRaw, categories, suggestions] = await Promise.all([
    listExpenses(session.user.id, { take: 200 }),
    listCategories(session.user.id),
    getExpenseSuggestions(session.user.id, 5),
  ])
  const expenses = expensesRaw.map((expense) => ({
    id: expense.id,
    description: expense.description,
    occurredOn: expense.occurredOn.toISOString(),
    categoryId: expense.category?.id ?? null,
    categoryName: expense.category?.name ?? "Uncategorized",
    amount: expense.amount,
    impactAmount: expense.impactAmount,
    groupId: expense.group?.id ?? null,
    groupTitle: expense.group?.title ?? null,
    groupNotes: expense.group?.notes ?? null,
    splitBy: expense.group?.splitBy ?? null,
  }))

  return (
    <DashboardShell
      heading="Expenses"
      description="Review and remove any expense entries that no longer belong in your ledger."
      user={session.user}
    >
      <ExpenseList
        initialExpenses={expenses}
        currency={session.user.defaultCurrency}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
        }))}
        suggestions={suggestions}
      />
    </DashboardShell>
  )
}
