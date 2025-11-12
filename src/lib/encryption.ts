import {createCipheriv, createDecipheriv, randomBytes} from "crypto"
import type {Prisma} from "@prisma/client"

const ALGORITHM = "aes-256-gcm"
const AUTH_TAG_LENGTH = 16
const IV_LENGTH = 12

export type EncryptedPayload = {
    iv: string
    tag: string
    cipher: string
    type: "string" | "number"
}

function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
        throw new Error("ENCRYPTION_KEY is not set")
    }
    const decoded = Buffer.from(key, "base64")
    if (decoded.length !== 32) {
        throw new Error("ENCRYPTION_KEY must decode to 32 bytes")
    }
    return decoded
}

function encryptInternal(value: string, type: "string" | "number") {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    })
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
    const tag = cipher.getAuthTag()

    const payload: EncryptedPayload = {
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        cipher: encrypted.toString("base64"),
        type,
    }

    return payload
}

function decryptInternal(payload: EncryptedPayload) {
    const key = getEncryptionKey()
    const decipher = createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(payload.iv, "base64"),
        {authTagLength: AUTH_TAG_LENGTH}
    )
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"))
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.cipher, "base64")),
        decipher.final(),
    ])
    return decrypted.toString("utf8")
}

export function encryptString(value: string) {
    return encryptInternal(value, "string")
}

export function decryptString(payload: Prisma.JsonValue | null, fallback = "") {
    try {
        const parsed = parseEncrypted(payload)
        if (!parsed) return fallback
        const result = decryptInternal(parsed)
        return result || fallback
    } catch (error) {
        return fallback
    }
}

export function encryptNumber(value: number) {
    return encryptInternal(value.toString(), "number")
}

export function decryptNumber(payload: Prisma.JsonValue | null, fallback = 0) {
    try {
        const parsed = parseEncrypted(payload)
        if (!parsed) return fallback
        const result = Number(decryptInternal(parsed))
        return Number.isFinite(result) ? result : fallback
    } catch (error) {
        return fallback
    }
}

export function serializeEncrypted(payload: EncryptedPayload) {
    return payload as Prisma.InputJsonValue
}

export function parseEncrypted(payload: Prisma.JsonValue | null) {
    if (!payload || typeof payload !== "object") {
        return null
    }
    const record = payload as Record<string, string>
    if (!record.iv || !record.tag || !record.cipher) {
        return null
    }
    return record as EncryptedPayload
}
