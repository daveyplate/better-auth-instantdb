import "dotenv/config"
import { init } from "@instantdb/admin"
// @ts-ignore
import schema from "./instant.schema"
const batchSize = 50

async function syncEmails() {
    let transactions = []
    const batches = []

    const db = init({
        appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
        adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
        schema: schema
    })

    try {
        // Query for all $users entities with their linked user entities
        const result = await db.query({
            $users: {
                user: {}
            }
        })

        const $users = result.$users

        console.log(`Found ${$users.length} $users entities to check`)
        let mismatchCount = 0

        // Iterate over all $users entities
        for (const $user of $users) {
            // Skip if user link doesn't exist
            if (!$user.user) {
                console.log(`User link not found for $users entity: ${$user.id}`)
                continue
            }

            // Check if emails don't match
            // @ts-ignore
            if ($user.email !== $user.user.email) {
                mismatchCount++

                // Create transaction to update $users email to match user email

                // @ts-ignore
                transactions.push(db.tx.$users[$user.id].update({ email: $user.user.email }))

                // We have enough transactions to create a batch
                if (transactions.length >= batchSize) {
                    batches.push(transactions)
                    transactions = [] // Reset transactions for the next batch
                }
            }
        }

        // Add any remaining transactions to the last batch
        if (transactions.length) {
            batches.push(transactions)
        }

        console.log(`Found ${mismatchCount} email mismatches to fix`)

        // Now process each batch
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]
            console.log(
                `Processing batch ${i + 1}/${batches.length} (${batch.length} transactions)`
            )

            await db.transact(batch)
        }

        console.log("Email migration completed successfully.")
    } catch (error) {
        console.error("Error during email migration:", error)
    }
}

syncEmails()
