import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {assertValidCsvFile, importCsvData} from "@/lib/services/import-service"
import {csvImportSchema} from "@/lib/validation"

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json(
                {error: "CSV import requires a signed-in session."},
                {status: 403}
            )
        }

        const formData = await request.formData()
        const file = formData.get("file")
        if (!(file instanceof File)) {
            return json({error: "File is required"}, {status: 400})
        }
        try {
            assertValidCsvFile(file)
        } catch (validationError) {
            return json(
                {error: validationError instanceof Error ? validationError.message : "Invalid file"},
                {status: 400}
            )
        }

        const parsed = csvImportSchema.parse({
            mode: formData.get("mode") ?? "expenses",
            template: (formData.get("template") as string) ?? "default",
        })
        const result = await importCsvData(
            auth.userId,
            parsed.mode,
            file,
            parsed.template
        )
        return json(result, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
