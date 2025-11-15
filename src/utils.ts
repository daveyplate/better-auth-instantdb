import util from "node:util"

/**
 * Pretty prints an object.
 * @param object - The object to pretty print.
 * @returns The pretty printed object.
 */
export function prettyPrint(object: unknown) {
  return util.inspect(object, { colors: true, depth: null })
}
