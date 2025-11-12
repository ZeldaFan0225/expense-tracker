import {format} from "date-fns"

export function formatCurrency(
    amount: number,
    currency: string = "USD",
    locale = "en-US"
) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)
}

export function getMonthKey(date: Date) {
    return format(date, "yyyy-MM")
}
