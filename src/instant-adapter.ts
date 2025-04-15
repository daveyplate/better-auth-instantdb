import type { InstantAdminDatabase, InstantSchemaDef, TransactionChunk } from "@instantdb/admin"
import { id } from "@instantdb/react"
import type { Where } from "better-auth"
import { createAdapter } from "better-auth/adapters"

type Direction = "asc" | "desc"
type Order = { [key: string]: Direction }

export interface InstantDBAdapterConfig {
    /**
     * Helps you debug issues with the adapter.
     */
    debugLogs?: boolean
    /**
     * If the table names in the schema are plural.
     */
    usePlural?: boolean
    /**
     * Hooks to add additional transactions to the create and update methods.
     */
    transactionHooks?: {
        create?: ({
            model,
            data
        }: {
            model: string
            // biome-ignore lint/suspicious/noExplicitAny:
            data: Record<string, any>
            // biome-ignore lint/suspicious/noExplicitAny:
        }) => Promise<TransactionChunk<any, any>[] | undefined> | Promise<void>
        update?: ({
            model,
            update,
            where
        }: {
            model: string
            // biome-ignore lint/suspicious/noExplicitAny:
            update: Record<string, any>
            where: Where[]
            // biome-ignore lint/suspicious/noExplicitAny:
        }) => Promise<TransactionChunk<any, any>[] | undefined> | Promise<void>
    }
    // biome-ignore lint/suspicious/noExplicitAny:
    db: InstantAdminDatabase<InstantSchemaDef<any, any, any>>
}

export function parseWhere(where?: Where[]) {
    const whereQuery = {} as Record<string, unknown>
    where?.map((item) => {
        switch (item.operator) {
            case "eq":
                whereQuery[item.field] = item.value
                break
            case "in":
                whereQuery[item.field] = { $in: item.value }
                break
            case "contains":
                whereQuery[item.field] = { $like: `%${item.value}%` }
                break
            case "starts_with":
                whereQuery[item.field] = { $like: `${item.value}%` }
                break
            case "ends_with":
                whereQuery[item.field] = { $like: `%${item.value}` }
                break
            case "ne":
                whereQuery[item.field] = { $not: item.value }
                break
            case "gt":
                whereQuery[item.field] = { $gt: item.value }
                break
            case "gte":
                whereQuery[item.field] = { $gte: item.value }
                break
            case "lt":
                whereQuery[item.field] = { $lt: item.value }
                break
            case "lte":
                whereQuery[item.field] = { $lte: item.value }
                break
        }
    })

    return whereQuery
}

export const instantDBAdapter = ({
    usePlural = true,
    debugLogs = false,
    transactionHooks,
    db
}: InstantDBAdapterConfig) =>
    createAdapter({
        config: {
            adapterId: "instantdb-adapter", // A unique identifier for the adapter.
            adapterName: "InstantDB Adapter", // The name of the adapter.
            usePlural, // Whether the table names in the schema are plural.
            debugLogs, // Whether to enable debug logs.
            supportsJSON: false, // Whether the database supports JSON. (Default: true)
            supportsDates: false, // Whether the database supports dates. (Default: true)
            supportsBooleans: true, // Whether the database supports booleans. (Default: true)
            disableIdGeneration: true, // Whether to disable automatic ID generation. (Default: false)
            supportsNumericIds: false // Whether the database supports numeric IDs. (Default: true)
        },
        adapter: ({ options, getFieldName, getDefaultModelName }) => {
            return {
                async create({ data, model }) {
                    // @ts-ignore
                    data.id = options.advanced?.database?.generateId
                        ? options.advanced.database.generateId({ model })
                        : id()

                    const transactions = []

                    // Create the InstantDB $user
                    if (getDefaultModelName(model) === "user") {
                        const email = `${data.id}@user.id`
                        transactions.push(db.tx.$users[data.id].update({ email }))
                    }

                    // Create the InstantDB token and override session.token
                    if (getDefaultModelName(model) === "session") {
                        const email = `${data.userId}@user.id`
                        const token = await db.auth.createToken(email)

                        const tokenField = getFieldName({ model, field: "token" })

                        // @ts-ignore
                        data[tokenField] = token
                    }

                    transactions.push(db.tx[model][data.id].update(data))

                    // Link user to $users
                    if (getDefaultModelName(model) === "user") {
                        transactions.push(db.tx[model][data.id].link({ $user: data.id }))
                    }

                    // Link other models to user
                    try {
                        const userIdField = getFieldName({ model, field: "userId" })

                        if (data[userIdField]) {
                            transactions.push(
                                db.tx[model][data.id].link({ user: data[userIdField] })
                            )
                        }
                    } catch (error) {}

                    if (transactionHooks?.create) {
                        const hookTransactions = await transactionHooks.create({
                            data,
                            model
                        })

                        if (hookTransactions) transactions.push(...hookTransactions)
                    }

                    if (debugLogs) {
                        console.log("[InstantDB] Transact:", JSON.stringify(transactions))
                    }

                    await db.transact(transactions)

                    return data
                },
                async count({ model, where }) {
                    const result = await db.query({ [model]: { $: { where: parseWhere(where) } } })

                    return result[model].length
                },
                async delete({ model, where }) {
                    const result = await db.query({ [model]: { $: { where: parseWhere(where) } } })

                    // If a session is deleted, we need to sign out the token
                    if (getDefaultModelName(model) === "session") {
                        result[model].map(async (entity) => {
                            try {
                                const tokenField = getFieldName({ model, field: "token" })
                                await db.auth.signOut({
                                    refresh_token: entity[tokenField] as string
                                })
                            } catch (error) {}
                        })
                    }

                    const transactions = result[model].map((entity) =>
                        db.tx[model][entity.id].delete()
                    )

                    if (debugLogs) {
                        console.log("[InstantDB] Transact:", JSON.stringify(transactions))
                    }

                    await db.transact(transactions)
                },
                async deleteMany({ model, where }) {
                    const result = await db.query({ [model]: { $: { where: parseWhere(where) } } })

                    // If a sessions are deleted, we need to sign out the tokens
                    if (getDefaultModelName(model) === "session") {
                        result[model].map(async (entity) => {
                            try {
                                const tokenField = getFieldName({ model, field: "token" })
                                await db.auth.signOut({
                                    refresh_token: entity[tokenField] as string
                                })
                            } catch (error) {}
                        })
                    }

                    await db.transact(
                        result[model].map((entity) => db.tx[model][entity.id].delete())
                    )

                    return result[model].length
                },
                async findMany({ model, where, limit, sortBy, offset }) {
                    let order: Order | undefined
                    if (sortBy) {
                        order = {
                            [sortBy.field]: sortBy.direction
                        }
                    }

                    const query: Parameters<typeof db.query>[0] = {
                        [model]: { $: { where: parseWhere(where), limit, offset, order } }
                    }

                    if (debugLogs) {
                        console.log("[InstantDB] Query:", JSON.stringify(query))
                    }

                    const result = await db.query(query)

                    if (debugLogs) {
                        console.log("[InstantDB] Result:", JSON.stringify(result))
                    }

                    // biome-ignore lint/suspicious/noExplicitAny:
                    return result[model] as any[]
                },
                async findOne({ model, where }) {
                    const result = await db.query({ [model]: { $: { where: parseWhere(where) } } })

                    // biome-ignore lint/suspicious/noExplicitAny:
                    if (result[model].length) return result[model][0] as any

                    return null
                },
                async update({ model, update, where }) {
                    const result = await db.query({ [model]: { $: { where: parseWhere(where) } } })

                    const transactions = result[model].map((entity) =>
                        db.tx[model][entity.id].update(update as Record<string, unknown>)
                    )

                    if (transactionHooks?.update) {
                        const hookTransactions = await transactionHooks.update({
                            update: update as Record<string, unknown>,
                            model,
                            where
                        })

                        if (hookTransactions) transactions.push(...hookTransactions)
                    }

                    await db.transact(transactions)

                    if (result[model].length) {
                        return { ...result[model][0], ...update }
                    }

                    return null
                },
                async updateMany({ model, update, where }) {
                    const result = await db.query({ [model]: { $: { where: parseWhere(where) } } })

                    const transactions = result[model].map((entity) =>
                        db.tx[model][entity.id].update(update)
                    )

                    if (transactionHooks?.update) {
                        const hookTransactions = await transactionHooks.update({
                            update: update as Record<string, unknown>,
                            model,
                            where
                        })

                        if (hookTransactions) {
                            transactions.push(...hookTransactions)
                        }
                    }

                    await db.transact(transactions)

                    return result[model].length
                },
                options: { usePlural, debugLogs }
            }
        }
    })
