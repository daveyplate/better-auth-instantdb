import type {
  EntitiesDef,
  InstantAdminDatabase,
  InstantSchemaDef,
  LinksDef,
  RoomsDef
} from "@instantdb/admin"
import {
  createAdapterFactory,
  type DBAdapterDebugLogOption
} from "better-auth/adapters"
import { createSchema } from "./create-schema"

// Your custom adapter config options
interface InstantAdapterConfig {
  /**
   * Helps you debug issues with the adapter.
   */
  debugLogs?: DBAdapterDebugLogOption
  /**
   * If the table names in the schema are plural.
   */
  usePlural?: boolean
  /**
   * The InstantDB admin database instance.
   */
  db: InstantAdminDatabase<
    InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>
  >
}

export const instantAdapter = (config: InstantAdapterConfig) => {
  const usePlural = config.usePlural ?? false
  return createAdapterFactory({
    config: {
      adapterId: "instantdb-adapter", // A unique identifier for the adapter.
      adapterName: "InstantDB Adapter", // The name of the adapter.
      usePlural, // Whether the table names in the schema are plural.
      debugLogs: config.debugLogs ?? false, // Whether to enable debug logs.
      supportsJSON: true, // Whether the database supports JSON. (Default: false)
      supportsDates: true, // Whether the database supports dates. (Default: true)
      supportsBooleans: true, // Whether the database supports booleans. (Default: true)
      supportsNumericIds: false // Whether the database supports auto-incrementing numeric IDs. (Default: true)
    },
    adapter: ({
      options,
      schema,
      debugLog,
      getDefaultModelName,
      getDefaultFieldName
    }) => {
      return {
        create: async ({ data, model, select }) => {
          if (getDefaultModelName(model) === "user") {
            console.log("create user", data)
          }

          // console.log("create", data, model, select)
          throw new Error("Not implemented")
        },
        update: async ({ update, model, where }) => {
          return null
        },
        updateMany: async ({ update, model, where }) => {
          return 0
        },
        delete: async ({ model, where }) => {
          return
        },
        deleteMany: async ({ model, where }) => {
          return 0
        },
        findOne: async ({ model, where, select }) => {
          return null
        },
        findMany: async ({ model, where, limit, sortBy, offset }) => {
          return []
        },
        count: async ({ model, where }) => {
          return 0
        },
        createSchema: async ({ file, tables }) => {
          return createSchema(file ?? "./auth.schema.ts", tables, usePlural)
        }
      }
    }
  })
}
