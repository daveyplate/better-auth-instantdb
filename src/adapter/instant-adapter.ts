import type { BetterAuthDBSchema } from "@better-auth/core/db"
import {
  type InstantAdminDatabase,
  type InstaQLParams,
  id
} from "@instantdb/admin"
import {
  createAdapterFactory,
  type DBAdapterDebugLogOption,
  type Where
} from "better-auth/adapters"

import { fieldNameToLabel, prettyObject } from "../lib/utils"
import { createSchema } from "./create-schema"

type Direction = "asc" | "desc"
type Order = { [key: string]: Direction }

/**
 * Gets the InstantDB entity name for a given model name
 */
function getEntityName(
  modelName: string,
  tableKey: string,
  usePlural: boolean
): string {
  if (modelName === "user") {
    return "$users"
  }
  return usePlural ? `${tableKey}s` : tableKey
}

/**
 * Builds entity name mapping from schema
 */
function buildEntityNameMap(
  schema: BetterAuthDBSchema,
  usePlural: boolean
): Record<string, string> {
  const entityNameMap: Record<string, string> = {}
  for (const [key, table] of Object.entries(schema)) {
    const { modelName } = table
    entityNameMap[modelName] = getEntityName(modelName, key, usePlural)
  }
  return entityNameMap
}

/**
 * Creates link transactions for fields with references
 */
function createLinkTransactions({
  db,
  model,
  modelSchema,
  data,
  entityNameMap
}: {
  db: InstantAdminDatabase<any, any>
  model: string
  modelSchema: BetterAuthDBSchema[string]
  data: Record<string, unknown>
  entityNameMap: Record<string, string>
}): any[] {
  const linkTransactions: any[] = []
  const { fields, modelName } = modelSchema

  for (const [fieldKey, field] of Object.entries(fields)) {
    const { references } = field

    if (references) {
      const { model: targetModel } = references
      const targetEntityName = entityNameMap[targetModel]

      if (!targetEntityName) {
        console.warn(
          `Warning: Could not find entity name for model "${targetModel}" referenced by ${modelName}.${fieldKey}`
        )
        continue
      }

      // Check if data has a value for this reference field
      const fieldValue = data[fieldKey]
      if (fieldValue != null) {
        // Generate forward label from field name, using target model if field doesn't end with "id"
        const forwardLabel = fieldNameToLabel(fieldKey, targetModel)

        // Create link transaction
        const linkParams: Record<string, string | string[]> = {
          [forwardLabel]: fieldValue as string | string[]
        }
        const linkTransaction = db.tx[model][data.id as string].link(linkParams)

        linkTransactions.push(linkTransaction)
      }
    }
  }

  return linkTransactions
}

/**
 * The InstantDB adapter config options.
 */
interface InstantAdapterConfig {
  /**
   * The InstantDB admin database instance.
   */
  db: InstantAdminDatabase<any, any>
  /**
   * If the table names in the schema are plural.
   */
  usePlural?: boolean
  /**
   * Helps you debug issues with the adapter.
   */
  debugLogs?: DBAdapterDebugLogOption
}

/**
 * The InstantDB adapter.
 */
export const instantAdapter = ({
  db,
  usePlural = true,
  debugLogs = false
}: InstantAdapterConfig) => {
  return createAdapterFactory({
    config: {
      customIdGenerator: id,
      adapterId: "instantdb-adapter", // A unique identifier for the adapter.
      adapterName: "InstantDB Adapter", // The name of the adapter.
      usePlural, // Whether the table names in the schema are plural.
      debugLogs, // Whether to enable debug logs.
      supportsJSON: true, // Whether the database supports JSON. (Default: false)
      supportsDates: false, // Whether the database supports dates. (Default: true)
      supportsBooleans: true, // Whether the database supports booleans. (Default: true)
      supportsNumericIds: false // Whether the database supports auto-incrementing numeric IDs. (Default: true)
    },
    adapter: ({ debugLog, getDefaultModelName, getFieldName, schema }) => {
      return {
        create: async ({ data, model }) => {
          const defaultModelName = getDefaultModelName(model)
          const modelSchema = schema[defaultModelName]

          // Create the InstantDB token and override session.token
          if (defaultModelName === "session") {
            // Get the $users entity for this session's userId
            const result = await db.query({
              $users: { $: { where: { id: data.userId } } }
            })

            const $users = result.$users

            if (!$users.length) {
              throw new Error(`$users entity not found: ${data.userId}`)
            }

            const $user = $users[0]

            // Create the InstantDB token and override session.token

            debugLog("Create Token", $user.email)

            const token = await db.auth.createToken($user.email as string)
            const tokenField = getFieldName({ model, field: "token" })

            Object.assign(data, { [tokenField]: token })
          }

          if (defaultModelName === "user") {
            model = "$users"
          }

          debugLog("Create", model, prettyObject(data))

          // Build entity name map for link resolution
          const entityNameMap = buildEntityNameMap(schema, usePlural)

          // Create the main entity transaction
          const createTransaction = db.tx[model][data.id].create(data)

          // Create link transactions for fields with references
          const linkTransactions = createLinkTransactions({
            db,
            model,
            modelSchema,
            data,
            entityNameMap
          })

          // Combine all transactions and execute in a single transaction
          const allTransactions = [createTransaction, ...linkTransactions]
          await db.transact(allTransactions)

          return data
        },
        update: async ({ update, model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const entities = await fetchEntities({ db, model, where, debugLog })

          if (!entities.length) return null

          debugLog(
            "Update:",
            entities.map((entity) => entity.id),
            prettyObject(update)
          )

          const transactions = entities.map((entity) =>
            db.tx[model][entity.id].update(update as Record<string, unknown>)
          )

          await db.transact(transactions)

          return { ...entities[0], ...update }
        },
        updateMany: async ({ update, model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const entities = await fetchEntities({ db, model, where, debugLog })

          if (!entities.length) return 0

          debugLog(
            "Update:",
            entities.map((entity) => entity.id),
            prettyObject(update)
          )

          const transactions = entities.map((entity) =>
            db.tx[model][entity.id].update(update)
          )

          await db.transact(transactions)

          return entities.length
        },
        delete: async ({ model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const entities = await fetchEntities({ db, model, where, debugLog })

          if (!entities.length) return

          const transactions = entities.map((entity) =>
            db.tx[model][entity.id].delete()
          )

          await db.transact(transactions)

          if (getDefaultModelName(model) === "session") {
            Promise.all(
              entities.map(async (entity) => {
                try {
                  const tokenField = getFieldName({ model, field: "token" })
                  await db.auth.signOut({
                    refresh_token: entity[tokenField]
                  })
                } catch {}
              })
            )
          }
        },
        deleteMany: async ({ model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const entities = await fetchEntities({ db, model, where, debugLog })

          if (!entities.length) return 0

          const transactions = entities.map((entity) =>
            db.tx[model][entity.id].delete()
          )

          await db.transact(transactions)

          if (getDefaultModelName(model) === "session") {
            Promise.all(
              entities.map(async (entity) => {
                try {
                  const tokenField = getFieldName({ model, field: "token" })
                  await db.auth.signOut({
                    refresh_token: entity[tokenField]
                  })
                } catch {}
              })
            )
          }

          return entities.length
        },
        findOne: async ({ model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const entities = await fetchEntities({ db, model, where, debugLog })

          if (entities.length) return entities[0]

          return null
        },
        findMany: async ({ model, where, limit, sortBy, offset }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const entities = await fetchEntities({
            db,
            model,
            where,
            limit,
            sortBy,
            offset,
            debugLog
          })

          return entities
        },
        count: async ({ model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const entities = await fetchEntities({ db, model, where, debugLog })

          return entities.length
        },
        createSchema: async ({ file = "./auth.schema.ts", tables }) => {
          const code = createSchema(tables, usePlural)
          return { code, path: file }
        }
      }
    }
  })
}

async function fetchEntities({
  db,
  debugLog,
  model,
  where,
  limit,
  offset,
  sortBy
}: {
  db: InstantAdminDatabase<any, any>
  debugLog: (...args: any[]) => void
  model: string
  where?: Where[]
  limit?: number
  offset?: number
  sortBy?: { field: string; direction: "asc" | "desc" }
}) {
  let order: Order | undefined
  if (sortBy) {
    order = {
      [sortBy.field]: sortBy.direction
    }
  }

  const query = {
    [model]: { $: { where: parseWhere(where), limit, offset, order } }
  } as InstaQLParams<any>

  debugLog("Query", prettyObject(query))

  const result = await db.query(query)

  debugLog("Result", prettyObject(result))

  return result[model] as any[]
}

export function parseWhere(where?: Where[]) {
  const whereQuery = {} as Record<string, unknown>
  where?.forEach((item) => {
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
