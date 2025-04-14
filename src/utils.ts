/**
 * Simple pluralization: add 's' if not already ending with 's'
 */
export function pluralize(name: string) {
    return name.endsWith("s") ? name : `${name}s`
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}
