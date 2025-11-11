"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { FeatureHint } from "@/components/feature-hint"
import { useToast } from "@/components/providers/toast-provider"

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]

type OnboardingFlowProps = {
  defaultCurrency: string
  accentColor?: string | null
  hasLoggedExpense: boolean
  hasIncomeSetup: boolean
  hasApiKey: boolean
  onboardingCompleted: boolean
}

export function OnboardingFlow({
  defaultCurrency,
  accentColor,
  hasLoggedExpense,
  hasIncomeSetup,
  hasApiKey,
  onboardingCompleted,
}: OnboardingFlowProps) {
  const router = useRouter()
  const { showToast } = useToast()

  const currencyOptions = React.useMemo(() => {
    return currencies.includes(defaultCurrency)
      ? currencies
      : [defaultCurrency, ...currencies]
  }, [defaultCurrency])

  const [currency, setCurrency] = React.useState(defaultCurrency)
  const [accent, setAccent] = React.useState(accentColor ?? "#0ea5e9")
  const [incomeFields, setIncomeFields] = React.useState({
    description: "",
    amount: "",
    dueDay: "1",
  })
  const [expenseFields, setExpenseFields] = React.useState({
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  })

  const [personalizeComplete, setPersonalizeComplete] = React.useState(onboardingCompleted)
  const [incomeComplete, setIncomeComplete] = React.useState(onboardingCompleted || hasIncomeSetup)
  const [expenseComplete, setExpenseComplete] = React.useState(
    onboardingCompleted || hasLoggedExpense
  )

  const [savingSetup, startSavingSetup] = React.useTransition()
  const [savingExpense, startSavingExpense] = React.useTransition()

  const needsIncomeDetails =
    !incomeComplete &&
    (incomeFields.description.trim().length === 0 ||
      Number(incomeFields.amount) <= 0 ||
      Number.isNaN(Number(incomeFields.dueDay)))

  const canComplete = currency.length === 3 && accent.length > 0 && !needsIncomeDetails
  const finishedOnboarding = personalizeComplete && incomeComplete

  function handleIncomeFieldChange(
    field: "description" | "amount" | "dueDay",
    value: string
  ) {
    setIncomeFields((prev) => ({ ...prev, [field]: value }))
  }

  async function completeSetup() {
    if (!canComplete) {
      showToast({
        title: "Missing information",
        description: "Fill in currency, accent color, and income details before continuing.",
        variant: "destructive",
      })
      return
    }

    startSavingSetup(async () => {
      try {
        const settingsResponse = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultCurrency: currency,
            accentColor: accent,
            onboardingCompleted: true,
          }),
        })
        if (!settingsResponse.ok) {
          throw new Error("Failed to save preferences")
        }

        if (!incomeComplete) {
          const amountValue = Number(incomeFields.amount)
          const dueDayValue = Math.min(
            28,
            Math.max(1, Math.floor(Number(incomeFields.dueDay) || 1))
          )
          const incomeResponse = await fetch("/api/income/recurring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: incomeFields.description.trim(),
              amount: amountValue,
              dueDayOfMonth: dueDayValue,
            }),
          })
          if (!incomeResponse.ok) {
            throw new Error("Failed to create recurring income")
          }
        }

        setPersonalizeComplete(true)
        setIncomeComplete(true)
        showToast({
          title: "Onboarding saved",
          description: "Preferences and income template updated. Redirecting to Home.",
        })
        router.refresh()
        router.push("/home")
      } catch (error) {
        console.error(error)
        showToast({
          title: "Unable to complete onboarding",
          description: "Double-check your inputs and try again.",
          variant: "destructive",
        })
      }
    })
  }

  async function logSampleExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountValue = Number(expenseFields.amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      showToast({
        title: "Amount required",
        description: "Enter a positive amount before saving.",
        variant: "destructive",
      })
      return
    }

    startSavingExpense(async () => {
      try {
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: expenseFields.description || "Sample expense",
            amount: amountValue,
            impactAmount: amountValue,
            occurredOn: expenseFields.date,
          }),
        })
        if (!response.ok) {
          throw new Error("Failed to log expense")
        }
        setExpenseComplete(true)
        showToast({
          title: "Expense added",
          description: "Your first entry is live and feeding analytics.",
        })
        router.refresh()
      } catch (error) {
        console.error(error)
        showToast({
          title: "Unable to log expense",
          description: "Please retry in a moment.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-dashed">
        <CardHeader>
          <CardTitle>Welcome to Expense Flow</CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalize the workspace, wire up income automation, and preview shortcuts before
            diving into the Home summary.
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Personalize workspace</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a default currency and accent color for charts, feeds, and analytics.
              </p>
            </div>
            {personalizeComplete ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="currency">Default currency</Label>
                <Select
                  id="currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                >
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accent">Accent color</Label>
                <Input
                  id="accent"
                  type="color"
                  value={accent}
                  onChange={(event) => setAccent(event.target.value)}
                  className="h-12 w-full cursor-pointer rounded-xl border px-2 py-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Set up your income</CardTitle>
              <p className="text-sm text-muted-foreground">
                Describe a recurring income source so forecasts stay aligned with reality.
              </p>
            </div>
            {incomeComplete ? <CheckCircle2 className="size-5 text-emerald-500" /> : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="income-description">Income description</Label>
              <Input
                id="income-description"
                placeholder="Monthly salary"
                value={incomeFields.description}
                onChange={(event) => handleIncomeFieldChange("description", event.target.value)}
                disabled={incomeComplete}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="income-amount">Amount</Label>
                <Input
                  id="income-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="4500"
                  value={incomeFields.amount}
                  onChange={(event) => handleIncomeFieldChange("amount", event.target.value)}
                  disabled={incomeComplete}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="income-due-day">Due day</Label>
                <Input
                  id="income-due-day"
                  type="number"
                  min="1"
                  max="28"
                  value={incomeFields.dueDay}
                  onChange={(event) => handleIncomeFieldChange("dueDay", event.target.value)}
                  disabled={incomeComplete}
                />
              </div>
            </div>
            {!incomeComplete ? (
              <p className="text-xs text-muted-foreground">
                We materialize recurring income on the selected day each month (clamped to 28).
              </p>
            ) : (
              <p className="text-xs text-emerald-500">
                Income automation already configured. You can add more later from the income page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        className="w-full rounded-3xl py-4 text-base font-semibold"
        disabled={savingSetup || !canComplete}
        onClick={completeSetup}
      >
        {savingSetup ? "Saving setup..." : "Complete onboarding"}
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Log your first expense</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add a sample transaction so charts, feeds, and analytics have data to chew on.
              </p>
            </div>
            {expenseComplete ? <CheckCircle2 className="size-5 text-emerald-500" /> : null}
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={logSampleExpense}>
              <div className="space-y-1.5">
                <Label htmlFor="expense-description">Description</Label>
                <Input
                  id="expense-description"
                  placeholder="Groceries run"
                  value={expenseFields.description}
                  onChange={(event) =>
                    setExpenseFields((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="expense-amount">Amount</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="54.30"
                    value={expenseFields.amount}
                    onChange={(event) =>
                      setExpenseFields((prev) => ({ ...prev, amount: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expense-date">Date</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseFields.date}
                    onChange={(event) =>
                      setExpenseFields((prev) => ({ ...prev, date: event.target.value }))
                    }
                  />
                </div>
              </div>
              <Button type="submit" disabled={savingExpense}>
                {expenseComplete ? "Add another expense" : "Save sample expense"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Preview automations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate scoped API keys and read the docs to trigger daily summaries via Shortcuts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hasApiKey
                ? "You already have an API key -- create more for each integration and revoke when done."
                : "Create your first API key to call /api/summary or other analytics endpoints safely."}
            </p>
            <div className="flex flex-wrap gap-3">
              <FeatureHint
                label="Scoped API keys"
                description="Use analytics:read to call the Home summary endpoint from Shortcuts."
              >
                <Button asChild>
                  <a href="/api-keys">Open API keys</a>
                </Button>
              </FeatureHint>
              <Button asChild variant="ghost">
                <a href="/docs">View API docs</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Head to Home after onboarding</p>
          <p className="text-xs text-muted-foreground">
            The Home view hosts your daily summary cards and shares the `/api/summary` contract for
            automation.
          </p>
        </div>
        <Button variant="outline" disabled={!finishedOnboarding} onClick={() => router.push("/home")}>
          View Home
        </Button>
      </div>
    </div>
  )
}
