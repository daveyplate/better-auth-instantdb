import type { BetterAuthDBSchema, DBFieldAttribute } from "@better-auth/core/db"

import { fieldNameToLabel } from "../lib/utils"

/**
 * Converts a Better Auth field type to InstantDB field type
 */
function convertFieldType(field: DBFieldAttribute, modelName: string) {
  const { type, required, unique, sortable } = field

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

  // For user model, ensure all fields end with optional()
  if (modelName === "user" && !fieldType.endsWith(".optional()")) {
    fieldType += ".optional()"
  }

  return fieldType
}

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
 * Converts a table/model name to camelCase for link names
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Creates InstantDB links from Better Auth schema references
 */
export function createLinks(
  tables: BetterAuthDBSchema,
  usePlural: boolean
): Record<string, any> {
  const links: Record<string, any> = {}
  const entityNameMap: Record<string, string> = {}

  // First pass: build entity name mapping
  for (const [key, table] of Object.entries(tables)) {
    const { modelName } = table
    entityNameMap[modelName] = getEntityName(modelName, key, usePlural)
  }

  // Second pass: find all references and create links
  for (const [key, table] of Object.entries(tables)) {
    const { modelName, fields } = table
    const sourceEntityName = getEntityName(modelName, key, usePlural)

    for (const [fieldKey, field] of Object.entries(fields)) {
      const { references } = field

      if (references) {
        const { model: targetModel, onDelete } = references
        const targetEntityName = entityNameMap[targetModel]

        if (!targetEntityName) {
          console.warn(
            `Warning: Could not find entity name for model "${targetModel}" referenced by ${modelName}.${fieldKey}`
          )
          continue
        }

        // Generate link name: {sourceTable}{targetTable}
        // e.g., "sessions" + "User" -> "sessionsUser"
        const sourceTableName = sourceEntityName.replace("$", "")
        const targetTableName =
          targetModel.charAt(0).toUpperCase() +
          toCamelCase(targetModel.slice(1))
        const linkName = `${sourceTableName}${targetTableName}`

        // Generate forward label from field name, using target model if field doesn't end with "id"
        const forwardLabel = fieldNameToLabel(fieldKey, targetModel)

        // Generate reverse label (use source entity name without $ prefix)
        const reverseLabel = sourceEntityName.replace("$", "")

        // Create link definition
        links[linkName] = {
          forward: {
            on: sourceEntityName,
            has: "one",
            label: forwardLabel,
            onDelete: onDelete || "cascade"
          },
          reverse: {
            on: targetEntityName,
            has: "many",
            label: reverseLabel
          }
        }
      }
    }
  }

  return links
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

    // For other tables, use the key as entity name
    const entityFields: string[] = []

    for (const [fieldKey, field] of Object.entries(fields)) {
      const fieldType = convertFieldType(field, modelName)
      entityFields.push(`${fieldKey}: ${fieldType}`)
    }

    // Pluralize table name if usePlural is true
    const namespace =
      modelName === "user" ? "$users" : usePlural ? `${key}s` : key
    entities[namespace] =
      `i.entity({\n      ${entityFields.join(",\n      ")}\n    })`
  }

  // Generate links from references
  const links = createLinks(tables, usePlural)

  // Generate the schema file content
  const entitiesString = Object.entries(entities)
    .map(([name, definition]) => `    ${name}: ${definition}`)
    .join(",\n")

  // Format links as string
  const linksString = Object.entries(links)
    .map(([linkName, linkDef]) => {
      const forward = linkDef.forward
      const reverse = linkDef.reverse
      return `    ${linkName}: {
      forward: {
        on: "${forward.on}",
        has: "${forward.has}",
        label: "${forward.label}"${forward.onDelete ? `,\n        onDelete: "${forward.onDelete}"` : ""}
      },
      reverse: {
        on: "${reverse.on}",
        has: "${reverse.has}",
        label: "${reverse.label}"
      }
    }`
    })
    .join(",\n")

  const linksSection = linksString ? `,\n  links: {\n${linksString}\n  }` : ""

  return `// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react"

export const authSchema = i.schema({
  entities: {
${entitiesString}
  }${linksSection}
})
`
}
