// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react"

function pluralize(name: string) {
    // Simple pluralization: add 's' if not already ending with 's'
    return name.endsWith("s") ? name : `${name}s`
}

type FieldType = "string" | "date" | "boolean" | "number"
type AdditionalField = { type: FieldType; indexed?: boolean; unique?: boolean }
type NamespaceConfig = {
    modelName?: string
    fields?: Record<string, string>
    additionalFields?: Record<string, AdditionalField>
}

// Plugin config type - similar to NamespaceConfig but without usePlural
type PluginConfig = {
    modelName?: string
    fields?: Record<string, string>
    additionalFields?: Record<string, AdditionalField>
}

type EntityName = "account" | "session" | "user" | "verification"
type FieldDef = ReturnType<typeof i.string>
type EntityDef = ReturnType<typeof i.entity>

// Plugin system interfaces
export interface AuthPlugin {
    name: string
    entities?: Record<string, Record<string, FieldDef>>
    extendEntities?: Partial<Record<EntityName, Record<string, FieldDef>>>
    links?: Record<
        string,
        {
            forward: {
                on: string
                has: "one" | "many"
                label: string
                onDelete?: "cascade"
            }
            reverse: {
                on: string
                has: "many" | "one"
                label: string
            }
        }
    >
}

// Factory function type for creating plugins
export type AuthPluginFactory = (config?: PluginConfig) => AuthPlugin

const defaultEntityFields: Record<EntityName, Record<string, FieldDef>> = {
    account: {
        accessToken: i.string(),
        accessTokenExpiresAt: i.date(),
        accountId: i.string(),
        createdAt: i.date(),
        idToken: i.string(),
        password: i.string(),
        providerId: i.string(),
        refreshToken: i.string(),
        refreshTokenExpiresAt: i.date(),
        scope: i.string(),
        updatedAt: i.date(),
        userId: i.string().indexed()
    },
    session: {
        createdAt: i.date(),
        expiresAt: i.date().indexed(),
        ipAddress: i.string(),
        token: i.string(),
        updatedAt: i.date(),
        userAgent: i.string(),
        userId: i.string()
    },
    user: {
        createdAt: i.date(),
        email: i.string().unique(),
        emailVerified: i.boolean(),
        image: i.string(),
        name: i.string(),
        updatedAt: i.date()
    },
    verification: {
        createdAt: i.date().indexed(),
        expiresAt: i.date().indexed(),
        identifier: i.string(),
        updatedAt: i.date(),
        value: i.string()
    }
}

const typeMap: Record<FieldType, FieldDef> = {
    string: i.string(),
    date: i.date(),
    boolean: i.boolean(),
    number: i.number()
}

function buildFields(entity: EntityName, ns?: NamespaceConfig, plugins: AuthPlugin[] = []) {
    const fields: Record<string, FieldDef> = {}
    const fieldMap = ns?.fields || {}
    // Map default fields, renaming if needed
    for (const [def, value] of Object.entries(defaultEntityFields[entity])) {
        const custom = fieldMap[def] || def
        fields[custom] = value
    }
    // Add additionalFields
    if (ns?.additionalFields) {
        for (const [name, optsRaw] of Object.entries(ns.additionalFields)) {
            const opts = optsRaw as AdditionalField
            let field = typeMap[opts.type]
            if (opts.indexed) field = field.indexed()
            if (opts.unique) field = field.unique()
            fields[name] = field
        }
    }

    // Add plugin fields to entity
    for (const plugin of plugins) {
        if (plugin.extendEntities?.[entity]) {
            for (const [fieldName, fieldDef] of Object.entries(plugin.extendEntities[entity])) {
                fields[fieldName] = fieldDef
            }
        }
    }

    return fields
}

// Config object that will be passed to createAuthSchema
type AuthSchemaConfig = {
    usePlural?: boolean
    namespaces?: Partial<Record<EntityName, NamespaceConfig>>
    plugins?: (AuthPlugin | [AuthPluginFactory, PluginConfig])[]
}

// Get entity model name based on config
type GetEntityName<
    E extends EntityName,
    C extends AuthSchemaConfig
> = C["namespaces"] extends infer N
    ? N extends Partial<Record<EntityName, NamespaceConfig>>
        ? E extends keyof N
            ? N[E] extends { modelName: infer M }
                ? M extends string
                    ? M
                    : never
                : C["usePlural"] extends true
                  ? `${E}s`
                  : E
            : C["usePlural"] extends true
              ? `${E}s`
              : E
        : C["usePlural"] extends true
          ? `${E}s`
          : E
    : C["usePlural"] extends true
      ? `${E}s`
      : E

// Define types for plugin entities and links
type PluginEntities = Record<string, EntityDef>
type PluginLinks = Record<
    string,
    {
        forward: {
            on: string
            has: "one" | "many"
            label: string
            onDelete?: "cascade"
        }
        reverse: {
            on: string
            has: "one" | "many"
            label: string
        }
    }
>

// Helper type to make TypeScript happy with our dynamic schema building
type SchemaType<C extends AuthSchemaConfig> = {
    entities: Record<string, EntityDef>
    links: Record<
        string,
        {
            forward: {
                on: string
                has: "one" | "many"
                label: string
                onDelete?: "cascade"
            }
            reverse: {
                on: string
                has: "one" | "many"
                label: string
            }
        }
    >
}

// Get the exact user label name
type GetUserLabel<C extends AuthSchemaConfig> = C["namespaces"] extends {
    user: { modelName: infer U }
}
    ? U extends string
        ? Capitalize<U>
        : "User"
    : "User"

// Generate specific link key patterns for both singular and plural forms
type BaseLinkKeys<C extends AuthSchemaConfig> = C["usePlural"] extends true
    ?
          | `${GetEntityName<"account", C>}${GetUserLabel<C>}`
          | `${GetEntityName<"session", C>}${GetUserLabel<C>}`
          | `${GetEntityName<"user", C>}$user}`
    :
          | `${GetEntityName<"account", C>}${GetUserLabel<C>}`
          | `${GetEntityName<"session", C>}${GetUserLabel<C>}`
          | `${GetEntityName<"user", C>}$user}`

// Link definition type
type LinkDef = {
    forward: {
        on: string
        has: "one" | "many"
        label: string
        onDelete?: "cascade"
    }
    reverse: {
        on: string
        has: "one" | "many"
        label: string
    }
}

// The actual schema return type with entities, links and plugin entities
type AuthSchemaReturn<C extends AuthSchemaConfig> = {
    entities: {
        [K in EntityName as GetEntityName<K, C>]: EntityDef
    } & PluginEntities
    links: {
        [K in BaseLinkKeys<C>]: LinkDef
    } & Record<string, LinkDef>
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export function createAuthSchema<C extends AuthSchemaConfig>(config: C): AuthSchemaReturn<C> {
    const { usePlural = false, namespaces = {} } = config
    const plugins: AuthPlugin[] = []

    // Process plugin configurations
    if (config.plugins) {
        for (const pluginItem of config.plugins) {
            if (Array.isArray(pluginItem)) {
                // It's a plugin factory with config
                const [pluginFactory, pluginConfig] = pluginItem
                plugins.push(pluginFactory(pluginConfig))
            } else {
                // It's a plain plugin object
                plugins.push(pluginItem)
            }
        }
    }

    const defaultNames: Record<EntityName, string> = {
        user: "user",
        account: "account",
        session: "session",
        verification: "verification"
    }

    // Compute entity keys
    const entityKeys = {
        user:
            namespaces.user?.modelName ??
            (usePlural ? pluralize(defaultNames.user) : defaultNames.user),
        account:
            namespaces.account?.modelName ??
            (usePlural ? pluralize(defaultNames.account) : defaultNames.account),
        session:
            namespaces.session?.modelName ??
            (usePlural ? pluralize(defaultNames.session) : defaultNames.session),
        verification:
            namespaces.verification?.modelName ??
            (usePlural ? pluralize(defaultNames.verification) : defaultNames.verification)
    }

    // For labels, use the singular name (modelName or defaultName)
    const labelNames = {
        user: namespaces.user?.modelName ?? defaultNames.user,
        account: namespaces.account?.modelName ?? defaultNames.account,
        session: namespaces.session?.modelName ?? defaultNames.session,
        verification: namespaces.verification?.modelName ?? defaultNames.verification
    }

    // Get capitalized label names for generating camelCase keys
    const capitalizedLabels = {
        user: capitalizeFirstLetter(labelNames.user),
        account: capitalizeFirstLetter(labelNames.account),
        session: capitalizeFirstLetter(labelNames.session),
        verification: capitalizeFirstLetter(labelNames.verification)
    }

    // Build base schema
    const schema: SchemaType<C> = {
        entities: {
            [entityKeys.account]: i.entity(buildFields("account", namespaces.account, plugins)),
            [entityKeys.session]: i.entity(buildFields("session", namespaces.session, plugins)),
            [entityKeys.user]: i.entity(buildFields("user", namespaces.user, plugins)),
            [entityKeys.verification]: i.entity(
                buildFields("verification", namespaces.verification, plugins)
            )
        },
        links: {
            [`${entityKeys.account}${capitalizedLabels.user}`]: {
                forward: {
                    on: entityKeys.account,
                    has: "one",
                    label: labelNames.user,
                    onDelete: "cascade"
                },
                reverse: {
                    on: entityKeys.user,
                    has: "many",
                    label: entityKeys.account
                }
            },
            [`${entityKeys.session}${capitalizedLabels.user}`]: {
                forward: {
                    on: entityKeys.session,
                    has: "one",
                    label: labelNames.user,
                    onDelete: "cascade"
                },
                reverse: {
                    on: entityKeys.user,
                    has: "many",
                    label: entityKeys.session
                }
            },
            [`${entityKeys.user}$user`]: {
                forward: {
                    on: entityKeys.user,
                    has: "one",
                    label: "$user",
                    onDelete: "cascade"
                },
                reverse: {
                    on: "$users",
                    has: "one",
                    label: labelNames.user
                }
            }
        }
    }

    // Process custom plugin entities and links
    for (const plugin of plugins) {
        // Add plugin entities
        if (plugin.entities) {
            for (const [entityName, fields] of Object.entries(plugin.entities)) {
                const pluginEntityName = usePlural ? pluralize(entityName) : entityName
                schema.entities[pluginEntityName] = i.entity(fields)
            }
        }

        // Add plugin links
        if (plugin.links) {
            for (const [linkName, linkDef] of Object.entries(plugin.links)) {
                // Update any references to standard entity names (like "users")
                const updatedLinkDef = {
                    forward: { ...linkDef.forward },
                    reverse: { ...linkDef.reverse }
                }

                // Replace any "users" reference with the actual user entity key
                if (updatedLinkDef.reverse.on === "users") {
                    updatedLinkDef.reverse.on = entityKeys.user
                }

                // If the label is "user", replace it with the actual user label
                if (updatedLinkDef.forward.label === "user") {
                    updatedLinkDef.forward.label = labelNames.user
                }

                schema.links[linkName] = updatedLinkDef
            }
        }
    }

    return schema as unknown as AuthSchemaReturn<C>
}

// Define built-in plugins as factory functions
export const anonymousPlugin: AuthPluginFactory = (config?: PluginConfig) => ({
    name: "anonymous",
    extendEntities: {
        user: {
            isAnonymous: i.boolean()
        }
    }
})

export const usernamePlugin: AuthPluginFactory = (config?: PluginConfig) => ({
    name: "username",
    extendEntities: {
        user: {
            username: i.string().unique(),
            displayUsername: i.string().unique()
        }
    }
})

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
