import {prisma} from "@/lib/prisma"
import {apiKeyCreateSchema} from "@/lib/validation"
import {generateApiKeyToken, normalizeScopes,} from "@/lib/api-keys"

export async function listApiKeys(userId: string) {
    return prisma.apiKey.findMany({
        where: {userId},
        orderBy: {createdAt: "desc"},
    })
}

export async function createApiKey(userId: string, payload: unknown) {
    const data = apiKeyCreateSchema.parse(payload)
    const scopes = normalizeScopes(data.scopes)
    if (!scopes.length) {
        throw new Error("At least one valid scope is required")
    }
    const generated = generateApiKeyToken()

    const record = await prisma.apiKey.create({
        data: {
            userId,
            prefix: generated.prefix,
            hashedSecret: generated.hashedSecret,
            scopes,
            description: data.description,
            expiresAt: data.expiresAt,
        },
    })

    return {record, token: generated.token}
}

export async function revokeApiKey(userId: string, id: string) {
    if (!id) {
        throw new Error("API key id is required")
    }
    const apiKey = await prisma.apiKey.findFirstOrThrow({
        where: {id, userId},
    })
    if (apiKey.revokedAt) {
        await prisma.apiKey.delete({where: {id}})
        return {action: "deleted" as const}
    }
    await prisma.apiKey.update({
        where: {id},
        data: {revokedAt: new Date()},
    })
    return {action: "revoked" as const}
}
