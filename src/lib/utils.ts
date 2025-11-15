import util from "node:util"

/**
 * Pretty an object.
 * @param object - The object to pretty.
 * @returns The pretty object.
 */
export function prettyObject(object: unknown) {
  return util.inspect(object, { colors: true, depth: null })
}

/**
 * Converts a field name to a relationship label
 * e.g., "userId" -> "user", "organizationId" -> "organization"
 * If field doesn't end with "id", uses the target model name
 */
export function fieldNameToLabel(fieldName: string, targetModel: string): string {
  // Remove "Id" suffix if present
  if (fieldName.toLowerCase().endsWith("id")) {
    return fieldName.slice(0, -2)
  }
  // If it doesn't end with "id", use the target model name
  return targetModel
}
