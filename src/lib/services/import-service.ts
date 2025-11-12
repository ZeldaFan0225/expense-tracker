import {addDays} from "date-fns"
import {parse} from "csv-parse/sync"
import type {ImportFrequency} from "@prisma/client"
import {prisma} from "@/lib/prisma"
import {createExpense} from "@/lib/services/expense-service"
import {addIncome} from "@/lib/services/income-service"
import {ensureDefaultCategories} from "@/lib/services/category-service"
import {importRowSchema, importScheduleSchema} from "@/lib/validation"

const FALLBACK_COLORS = [
    "#0ea5e9",
    "#22d3ee",
    "#34d399",
    "#f97316",
    "#a855f7",
    "#f43f5e",
]

type ImportCsvColumn =
    | "date"
    | "description"
    | "category"
    | "amount"
    | "splitBy"

const BANK_TEMPLATES: Record<string, Partial<Record<ImportCsvColumn, string>>> = {
    default: {
        date: "date",
        description: "description",
        category: "category",
        amount: "amount",
    },
    monzo: {
        date: "date",
        description: "description",
        category: "category",
        amount: "amount",
    },
    chase: {
        date: "transaction date",
        description: "description",
        amount: "amount",
        category: "category",
    },
}

const CSV_ALLOWED_MIME_TYPES = new Set([
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
])

const MAX_UPLOAD_BYTES = Number(process.env.CSV_MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024)

export function assertValidCsvFile(file: File) {
    const mime = (file.type ?? "").toLowerCase()
    const name = (file.name ?? "").toLowerCase()
    if (!CSV_ALLOWED_MIME_TYPES.has(mime) && !name.endsWith(".csv")) {
        throw new Error("Unsupported file type. Upload a CSV file.")
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        const maxMb = Math.round((MAX_UPLOAD_BYTES / 1024 / 1024) * 10) / 10
        throw new Error(`File too large. Maximum upload size is ${maxMb} MB.`)
    }
}

async function findOrCreateCategory(userId: string, name: string) {
    const existing = await prisma.category.findFirst({
        where: {userId, name: {equals: name, mode: "insensitive"}},
    })
    if (existing) return existing.id

    const color = FALLBACK_COLORS[Math.floor(Math.random() * FALLBACK_COLORS.length)]
    const created = await prisma.category.create({
        data: {
            userId,
            name,
            color,
        },
    })
    return created.id
}

function normalizeRow(row: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])
    )
}

function pickValue(
    row: Record<string, string>,
    key: ImportCsvColumn,
    template: string
) {
    const config = BANK_TEMPLATES[template] ?? BANK_TEMPLATES.default
    const templateKey = config[key] ?? key
    return row[templateKey.toLowerCase()]
}

async function parseCsv(file: File) {
    const buffer = Buffer.from(await file.arrayBuffer())
    return parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as Record<string, string>[]
}

function mapCsvRow(raw: Record<string, string>, template = "default") {
    const row = normalizeRow(raw)
    return {
        date: pickValue(row, "date", template) ?? new Date().toISOString(),
        description: pickValue(row, "description", template) ?? "",
        category: pickValue(row, "category", template) ?? "",
        amount: Number(pickValue(row, "amount", template) ?? 0),
        splitBy: pickValue(row, "splitBy", template)
            ? Number(pickValue(row, "splitBy", template))
            : undefined,
    }
}

export async function previewCsvRows(
    userId: string,
    mode: "expenses" | "income",
    file: File,
    template = "default"
) {
    await ensureDefaultCategories(userId)
    const parsed = await parseCsv(file)
    const preview = parsed.slice(0, 50).map((row, index) => ({
        id: String(index),
        ...mapCsvRow(row, template),
    }))
    return preview
}

export async function importStructuredRows(
    userId: string,
    mode: "expenses" | "income",
    rows: unknown
) {
    await ensureDefaultCategories(userId)
    const parsed = importRowSchema.array().min(1).parse(rows)

    for (const row of parsed) {
        if (mode === "expenses") {
            const categoryId = row.categoryId
                ? row.categoryId
                : row.category
                    ? await findOrCreateCategory(userId, row.category)
                    : undefined
            await createExpense(userId, {
                occurredOn: row.date,
                description: row.description,
                amount: row.amount,
                splitBy: row.splitBy,
                categoryId,
            })
        } else {
            await addIncome(userId, {
                occurredOn: row.date,
                description: row.description,
                amount: row.amount,
            })
        }
    }

    return {imported: parsed.length}
}

export async function importCsvData(
    userId: string,
    mode: "expenses" | "income",
    file: File,
    template = "default"
) {
    await ensureDefaultCategories(userId)
    const parsed = await parseCsv(file)
    const rows = parsed.map((row) => mapCsvRow(row, template))
    return importStructuredRows(userId, mode, rows)
}

export async function listImportSchedules(userId: string) {
    return prisma.importSchedule.findMany({
        where: {userId},
        orderBy: {createdAt: "desc"},
    })
}

export async function createImportSchedule(userId: string, payload: unknown) {
    const data = importScheduleSchema.parse(payload)
    return prisma.importSchedule.create({
        data: {
            userId,
            name: data.name,
            mode: data.mode === "expenses" ? "expenses" : "income",
            template: data.template,
            frequency: data.frequency as ImportFrequency,
            sourceUrl: data.sourceUrl,
            nextRunAt: computeNextRun(data.frequency as ImportFrequency),
        },
    })
}

export async function updateImportSchedule(
    userId: string,
    id: string,
    payload: unknown
) {
    const data = importScheduleSchema.partial().parse(payload)
    await prisma.importSchedule.findFirstOrThrow({
        where: {id, userId},
    })
    return prisma.importSchedule.update({
        where: {id},
        data: {
            ...data,
            frequency: data.frequency as ImportFrequency | undefined,
            nextRunAt: data.frequency ? computeNextRun(data.frequency as ImportFrequency) : undefined,
        },
    })
}

export async function deleteImportSchedule(userId: string, id: string) {
    await prisma.importSchedule.findFirstOrThrow({where: {id, userId}})
    await prisma.importSchedule.delete({where: {id}})
}

export async function markImportScheduleRun(userId: string, id: string) {
    const schedule = await prisma.importSchedule.findFirstOrThrow({
        where: {id, userId},
    })
    const nextRunAt = computeNextRun(schedule.frequency)
    return prisma.importSchedule.update({
        where: {id},
        data: {
            lastRunAt: new Date(),
            nextRunAt,
        },
    })
}

function computeNextRun(frequency: ImportFrequency) {
    const now = new Date()
    switch (frequency) {
        case "weekly":
            return addDays(now, 7)
        case "biweekly":
            return addDays(now, 14)
        case "monthly":
            return addDays(now, 30)
        case "quarterly":
        default:
            return addDays(now, 90)
    }
}
