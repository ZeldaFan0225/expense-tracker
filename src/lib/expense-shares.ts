const MAX_SPLIT = 10

export function normalizeSplitCount(value?: string | number | null) {
    if (value === null || value === undefined || value === "") {
        return 1
    }
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number(value)
                : 1
    if (!Number.isFinite(parsed)) {
        return 1
    }
    const rounded = Math.round(parsed)
    if (rounded < 1) return 1
    if (rounded > MAX_SPLIT) return MAX_SPLIT
    return rounded
}

export function calculateImpactShare(amount: number, splitBy?: number | null) {
    if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !splitBy ||
        splitBy <= 1
    ) {
        return amount
    }
    return amount / splitBy
}
