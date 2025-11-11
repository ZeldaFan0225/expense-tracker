"use client"

import * as React from "react"
import { X } from "lucide-react"

type GuidedStep = {
  title: string
  description: string
}

type GuidedStepsProps = {
  steps: GuidedStep[]
  storageKey?: string
}

export function GuidedSteps({ steps, storageKey }: GuidedStepsProps) {
  const [visible, setVisible] = React.useState(true)
  const [ready, setReady] = React.useState(!storageKey)

  React.useEffect(() => {
    if (!storageKey) {
      return
    }
    const stored = localStorage.getItem(`guided:${storageKey}`)
    if (stored === "hidden") {
      setVisible(false)
    }
    setReady(true)
  }, [storageKey])

  if (!ready || !visible || !steps.length) {
    return null
  }

  function dismiss() {
    setVisible(false)
    if (storageKey) {
      localStorage.setItem(`guided:${storageKey}`, "hidden")
    }
  }

  return (
    <div className="relative space-y-4 rounded-3xl border bg-muted/40 p-4">
      <button
        type="button"
        aria-label="Dismiss tips"
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
        onClick={dismiss}
      >
        <X className="size-4" />
      </button>
      {steps.map((step, index) => (
        <div key={`${step.title}-${index}`} className="flex gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
