import {z} from "zod"

export const expenseSchema = z.object({
    amount: z.coerce.number().positive(),
    splitBy: z.coerce.number().int().min(1).max(10).optional(),
    description: z.string().min(1).max(120),
    occurredOn: z.coerce.date(),
    categoryId: z.string().cuid().optional(),
})

export const bulkExpenseSchema = z.object({
    items: z.array(expenseSchema).min(1).max(20),
    group: z
        .object({
            title: z.string().min(1).max(80),
            notes: z.string().max(240).optional(),
            splitBy: z.coerce.number().int().min(1).max(10).default(1),
        })
        .optional(),
})

export const recurringExpenseSchema = z.object({
    amount: z.coerce.number().positive(),
    description: z.string().min(1).max(120),
    categoryId: z.string().cuid().optional(),
    dueDayOfMonth: z.coerce.number().int().min(1).max(31).default(1),
    splitBy: z.coerce.number().int().min(1).max(10).default(1),
    isActive: z.coerce.boolean().optional(),
})

const nullableCuid = z.union([z.string().cuid(), z.null()])

export const recurringExpenseUpdateSchema = z.object({
    amount: z.coerce.number().positive().optional(),
    description: z.string().min(1).max(120).optional(),
    categoryId: nullableCuid.optional(),
    dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    splitBy: z.coerce.number().int().min(1).max(10).optional(),
    isActive: z.coerce.boolean().optional(),
})

export const incomeSchema = z.object({
    amount: z.coerce.number().positive(),
    description: z.string().min(1).max(120),
    occurredOn: z.coerce.date(),
})

export const incomeUpdateSchema = z.object({
    amount: z.coerce.number().positive().optional(),
    description: z.string().min(1).max(120).optional(),
    occurredOn: z.coerce.date().optional(),
})

export const recurringIncomeSchema = z.object({
    amount: z.coerce.number().positive(),
    description: z.string().min(1).max(120),
    dueDayOfMonth: z.coerce.number().int().min(1).max(31).default(1),
    isActive: z.coerce.boolean().optional(),
})

export const recurringIncomeUpdateSchema = z.object({
    amount: z.coerce.number().positive().optional(),
    description: z.string().min(1).max(120).optional(),
    dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    isActive: z.coerce.boolean().optional(),
})

export const categorySchema = z.object({
    id: z.string().cuid().optional(),
    name: z.string().min(2).max(32),
    color: z
        .string()
        .regex(/^#([0-9a-f]{3}){1,2}$/i, "Color must be a valid hex code"),
})

export const apiKeyCreateSchema = z.object({
    scopes: z.array(z.string()).min(1),
    description: z.string().max(120).optional(),
    expiresAt: z.coerce.date().optional(),
})

export const csvImportSchema = z.object({
    mode: z.enum(["expenses", "income"]),
    template: z.string().default("default"),
})

export const scenarioInputSchema = z.object({
    incomeDelta: z.coerce.number().optional(),
    expenseDelta: z.coerce.number().optional(),
    categoryOverrides: z
        .array(
            z.object({
                categoryId: z.string(),
                delta: z.coerce.number(),
            })
        )
        .optional(),
})

export const userSettingsSchema = z.object({
    defaultCurrency: z.string().min(3).max(3).optional(),
    accentColor: z
        .string()
        .regex(/^#([0-9a-f]{3}){1,2}$/i, "Color must be hex")
        .optional(),
    onboardingCompleted: z.coerce.boolean().optional(),
})

export const importRowSchema = z.object({
    date: z.coerce.date(),
    description: z.string().min(1),
    category: z.string().optional(),
    categoryId: z.string().optional(),
    amount: z.coerce.number(),
    splitBy: z.coerce.number().int().min(1).max(10).optional(),
})

export const importScheduleSchema = z.object({
    name: z.string().min(2).max(60),
    mode: z.enum(["expenses", "income"]),
    template: z.string().default("default"),
    frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly"]),
    sourceUrl: z.string().url().optional(),
})
