import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function safeNumber(value: unknown, fallback = 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export function assertNever(value: never, label = "Unexpected value"): never {
    throw new Error(`${label}: ${value as string}`)
}
