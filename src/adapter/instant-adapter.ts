import { type InstantAdminDatabase, id } from "@instantdb/admin"
import {
  createAdapterFactory,
  type DBAdapterDebugLogOption,
  type Where
} from "better-auth/adapters"
import { prettyPrint } from "../lib/utils"
import { createSchema } from "./create-schema"

type Direction = "asc" | "desc"
type Order = { [key: string]: Direction }

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
    adapter: ({ debugLog, getDefaultModelName, getFieldName }) => {
      return {
        create: async ({ data, model }) => {
          // Create the InstantDB token and override session.token
          if (getDefaultModelName(model) === "session") {
            // Get the $users entity for this session's userId with the user link
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

            // @ts-expect-error
            data[tokenField] = token
          }

          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          debugLog("Create", model, prettyPrint(data))

          await db.transact([db.tx[model][data.id].create(data)])

          return data
        },
        update: async ({ update, model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const query = { [model]: { $: { where: parseWhere(where) } } }

          debugLog("Query", prettyPrint(query))

          const result = await db.query(query as never)

          debugLog("Result", prettyPrint(result))

          const entities = result[model] as any[]

          if (!entities.length) return null

          debugLog(
            "Update:",
            entities.map((entity) => entity.id),
            prettyPrint(update)
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

          const query = { [model]: { $: { where: parseWhere(where) } } }

          debugLog("Query", prettyPrint(query))

          const result = await db.query(query as never)

          debugLog("Result", prettyPrint(result))

          const entities = result[model] as any[]

          debugLog(
            "Update:",
            entities.map((entity) => entity.id),
            prettyPrint(update)
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

          const query = { [model]: { $: { where: parseWhere(where) } } }

          debugLog("Query", prettyPrint(query))

          const result = await db.query(query as never)

          debugLog("Result", prettyPrint(result))

          const entities = result[model] as any[]

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

          const query = { [model]: { $: { where: parseWhere(where) } } }

          debugLog("Query", prettyPrint(query))

          const result = await db.query(query as never)

          debugLog("Result", prettyPrint(result))

          const entities = result[model] as any[]

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

          const query = { [model]: { $: { where: parseWhere(where) } } }

          debugLog("Query", prettyPrint(query))

          const result = await db.query(query as never)

          debugLog("Result", prettyPrint(result))

          const entities = result[model] as any[]

          if (entities.length) return entities[0]

          return null
        },
        findMany: async ({ model, where, limit, sortBy, offset }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          let order: Order | undefined
          if (sortBy) {
            order = {
              [sortBy.field]: sortBy.direction
            }
          }

          const query = {
            [model]: { $: { where: parseWhere(where), limit, offset, order } }
          }

          debugLog("Query", prettyPrint(query))

          const result = await db.query(query as never)

          debugLog("Result", prettyPrint(result))

          const entities = result[model]

          return entities as any[]
        },
        count: async ({ model, where }) => {
          if (getDefaultModelName(model) === "user") {
            model = "$users"
          }

          const query = { [model]: { $: { where: parseWhere(where) } } }

          debugLog("Query", prettyPrint(query))

          const result = await db.query(query as never)

          debugLog("Result", prettyPrint(result))

          const entities = result[model] as any[]
          return entities.length
        },
        createSchema: async ({ file, tables }) => {
          return createSchema(file ?? "./auth.schema.ts", tables, usePlural)
        }
      }
    }
  })
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
