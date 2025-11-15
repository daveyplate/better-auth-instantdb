import type { BetterAuthDBSchema, DBFieldAttribute } from "@better-auth/core/db"

/**
 * Converts a Better Auth field type to InstantDB field type
 */
function convertFieldType(field: DBFieldAttribute) {
  const { type, required, unique, sortable, references } = field

  console.log("references", references)

  // Handle type as string or array
  const typeStr = Array.isArray(type) ? type[0] : type

  let fieldType: string

  switch (typeStr) {
    case "string":
      fieldType = "i.string()"
      break
    case "boolean":
      fieldType = "i.boolean()"
      break
    case "date":
      fieldType = "i.date()"
      break
    case "number":
      fieldType = "i.number()"
      break
    case "json":
      fieldType = "i.json()"
      break
    case "number[]":
      fieldType = "i.json()"
      break
    case "string[]":
      fieldType = "i.json()"
      break
    default:
      fieldType = "i.string()" // Default to string for unknown types
  }

  // Apply modifiers
  if (unique) {
    fieldType += ".unique()"
  }

  // Only make optional if required is explicitly false
  // If required is true, never make it optional (even if defaultValue exists)
  if (required === false) {
    fieldType += ".optional()"
  }

  // Add indexed if sortable
  if (sortable) {
    fieldType += ".indexed()"
  }

  return fieldType
}

/**
 * Creates an InstantDB schema file from Better Auth schema format
 */
export function createSchema(
  tables: BetterAuthDBSchema,
  usePlural: boolean
): string {
  const entities: Record<string, string> = {}

  for (const [key, table] of Object.entries(tables)) {
    const { modelName, fields } = table

    console.log("modelName", modelName)
    // Special handling for user table
    if (modelName === "user") {
      const userFields: string[] = []
      const processedFields = new Set<string>()

      // Always add email, imageURL, and type at the top (exact format required)
      userFields.push("email: i.string().unique().indexed().optional()")
      processedFields.add("email")

      userFields.push("imageURL: i.string().optional()")
      processedFields.add("imageURL") // Skip imageURL if it exists in fields

      userFields.push("type: i.string().optional()")
      processedFields.add("type") // Skip type if it exists in fields

      // Add all other fields from the schema (including image as-is, don't transform it)
      // All Better Auth fields must be optional on $users
      for (const [fieldKey, field] of Object.entries(fields)) {
        // Skip fields that are always included at the top: email, imageURL, type
        if (processedFields.has(fieldKey)) {
          continue
        }

        // Add field as-is but force it to be optional
        const fieldType = convertFieldType(field)
        // Ensure it ends with .optional() - remove existing .optional() if present and add it
        const optionalFieldType = fieldType.endsWith(".optional()")
          ? fieldType
          : `${fieldType}.optional()`
        userFields.push(`${fieldKey}: ${optionalFieldType}`)
      }

      entities.$users = `i.entity({\n      ${userFields.join(",\n      ")}\n    })`
    } else {
      // For other tables, use the key as entity name
      const entityFields: string[] = []

      for (const [fieldKey, field] of Object.entries(fields)) {
        const fieldType = convertFieldType(field)
        entityFields.push(`${fieldKey}: ${fieldType}`)
      }

      // Pluralize table name if usePlural is true
      const namespace = usePlural ? `${key}s` : key
      entities[namespace] =
        `i.entity({\n      ${entityFields.join(",\n      ")}\n    })`
    }
  }

  // Generate the schema file content
  const entitiesString = Object.entries(entities)
    .map(([name, definition]) => `    ${name}: ${definition}`)
    .join(",\n")

  return `// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react"

export const authSchema = i.schema({
  entities: {
${entitiesString}
  }
})
`
}
