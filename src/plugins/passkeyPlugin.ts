import { i } from "@instantdb/react"
import type { AuthPluginFactory } from "../auth-schema"
import { pluralize } from "../utils"

// Define types used in the plugin
type FieldType = "string" | "date" | "boolean" | "number"
type AdditionalField = { type: FieldType; indexed?: boolean; unique?: boolean }
type PluginConfig = {
    modelName?: string
    fields?: Record<string, string>
    additionalFields?: Record<string, AdditionalField>
}
type FieldDef = ReturnType<typeof i.string>

// Define the type map for field types
const typeMap: Record<FieldType, FieldDef> = {
    string: i.string(),
    date: i.date(),
    boolean: i.boolean(),
    number: i.number()
}

export const passkeyPlugin: AuthPluginFactory = (config?: PluginConfig) => {
    const modelName = config?.modelName || "passkey"
    const singularName = modelName
    const pluralName = pluralize(modelName)

    // Process field mappings
    const fieldMap = config?.fields || {}
    const fields: Record<string, FieldDef> = {
        id: i.string(),
        name: i.string(),
        publicKey: i.string(),
        userId: i.string().indexed(),
        credentialID: i.string(),
        counter: i.number(),
        deviceType: i.string(),
        backedUp: i.boolean(),
        transports: i.string(),
        createdAt: i.date().indexed()
    }

    // Apply field mappings
    const processedFields: Record<string, FieldDef> = {}
    for (const [key, value] of Object.entries(fields)) {
        const mappedKey = fieldMap[key] || key
        processedFields[mappedKey] = value
    }

    // Add additional fields
    if (config?.additionalFields) {
        for (const [name, optsRaw] of Object.entries(config.additionalFields)) {
            const opts = optsRaw as AdditionalField
            let field = typeMap[opts.type]
            if (opts.indexed) field = field.indexed()
            if (opts.unique) field = field.unique()
            processedFields[name] = field
        }
    }

    // Determine the link key name with capitalized User
    const linkKey = `${pluralName}User`

    return {
        name: "passkey",
        entities: {
            [singularName]: processedFields
        },
        links: {
            [linkKey]: {
                forward: {
                    on: pluralName,
                    has: "one",
                    label: "user", // This will use the actual user label in createAuthSchema
                    onDelete: "cascade"
                },
                reverse: {
                    on: "users", // Will be replaced dynamically in createAuthSchema
                    has: "many",
                    label: pluralName
                }
            }
        }
    }
}
