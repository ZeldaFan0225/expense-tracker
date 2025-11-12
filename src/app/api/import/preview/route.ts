import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {csvImportSchema} from "@/lib/validation"
import {assertValidCsvFile, previewCsvRows} from "@/lib/services/import-service"

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

        const rows = await previewCsvRows(
            auth.userId,
            parsed.mode,
            file,
            parsed.template
        )
        return json({rows})
    } catch (error) {
        return handleApiError(error)
    }
}
