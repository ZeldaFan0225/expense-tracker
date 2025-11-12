import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.info(
        "No default seed implemented. Use src/lib/services/category-service.ts to seed per user."
    )
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
