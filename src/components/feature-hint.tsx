"use client"

import * as React from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type FeatureHintProps = {
  label: string
  description: string
  children: React.ReactElement
}

export function FeatureHint({ label, description, children }: FeatureHintProps) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">{label}</p>
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}
