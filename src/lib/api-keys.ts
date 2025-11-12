import bcrypt from "bcryptjs"
import {nanoid} from "nanoid"
import type {ApiScope} from "@prisma/client"

const BCRYPT_ROUNDS = 12
const TOKEN_PREFIX = "exp_"
const API_KEY_PREFIX_LENGTH = 8

export type GeneratedApiKey = {
    token: string
    prefix: string
    secret: string
    hashedSecret: string
}

export function generateApiKeyToken(): GeneratedApiKey {
    const prefix = nanoid(API_KEY_PREFIX_LENGTH).toLowerCase()
    const secret = nanoid(32)
    const token = `${TOKEN_PREFIX}${prefix}_${secret}`
    const hashedSecret = bcrypt.hashSync(secret, BCRYPT_ROUNDS)
    return {token, prefix, secret, hashedSecret}
}

export async function hashApiKeySecret(secret: string) {
    return bcrypt.hash(secret, BCRYPT_ROUNDS)
}

export function parseApiKeyToken(token: string | null) {
    if (!token || !token.startsWith(TOKEN_PREFIX)) return null
    const prefixStart = TOKEN_PREFIX.length
    const prefixEnd = prefixStart + API_KEY_PREFIX_LENGTH
    if (token.length <= prefixEnd) {
        return null
    }
    const separator = token[prefixEnd]
    if (separator !== "_") {
        return null
    }
    const prefix = token.slice(prefixStart, prefixEnd)
    const secret = token.slice(prefixEnd + 1)
    if (!prefix || !secret) {
        return null
    }
    return {prefix, secret}
}

export async function verifyApiKeySecret(secret: string, hashedSecret: string) {
    return bcrypt.compare(secret, hashedSecret)
}

export function scopesToStrings(scopes: ApiScope[] = []) {
    return scopes.map((scope) => scope.replace(/_/g, ":"))
}

export function normalizeScopes(scopes: string[]): ApiScope[] {
    return scopes
        .map((scope) => scope.replace(/:/g, "_"))
        .filter((scope): scope is ApiScope =>
            ["expenses_read", "expenses_write", "analytics_read", "income_write", "budget_read"].includes(
                scope as ApiScope
            )
        )
}
