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

type EntityName = "account" | "session" | "user" | "verification"
type FieldDef = ReturnType<typeof i.string>
type EntityDef = ReturnType<typeof i.entity>

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
        isAnonymous: i.boolean(),
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

function buildFields(entity: EntityName, ns?: NamespaceConfig) {
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
    return fields
}

// Config object that will be passed to createAuthSchema
type AuthSchemaConfig = {
    usePlural?: boolean
    namespaces?: Partial<Record<EntityName, NamespaceConfig>>
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
                : C["usePlural"] extends false
                  ? E
                  : `${E}s`
            : C["usePlural"] extends false
              ? E
              : `${E}s`
        : C["usePlural"] extends false
          ? E
          : `${E}s`
    : C["usePlural"] extends false
      ? E
      : `${E}s`

// The actual schema return type with correct entity keys
type AuthSchemaReturn<C extends AuthSchemaConfig> = {
    entities: {
        [K in EntityName as GetEntityName<K, C>]: EntityDef
    }
    links: {
        accountsUser: {
            forward: {
                on: GetEntityName<"account", C>
                has: "one"
                label: string
                onDelete: "cascade"
            }
            reverse: {
                on: GetEntityName<"user", C>
                has: "many"
                label: string
            }
        }
        sessionsUser: {
            forward: {
                on: GetEntityName<"session", C>
                has: "one"
                label: string
                onDelete: "cascade"
            }
            reverse: {
                on: GetEntityName<"user", C>
                has: "many"
                label: string
            }
        }
        users$user: {
            forward: {
                on: GetEntityName<"user", C>
                has: "one"
                label: string
                onDelete: "cascade"
            }
            reverse: {
                on: string
                has: "one"
                label: string
            }
        }
    }
}

export function createAuthSchema<C extends AuthSchemaConfig>(config: C): AuthSchemaReturn<C> {
    const { usePlural = true, namespaces = {} } = config

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

    return {
        entities: {
            [entityKeys.account]: i.entity(buildFields("account", namespaces.account)),
            [entityKeys.session]: i.entity(buildFields("session", namespaces.session)),
            [entityKeys.user]: i.entity(buildFields("user", namespaces.user)),
            [entityKeys.verification]: i.entity(
                buildFields("verification", namespaces.verification)
            )
        },
        links: {
            accountsUser: {
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
            sessionsUser: {
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
            users$user: {
                forward: {
                    on: entityKeys.user,
                    has: "one",
                    label: `$${labelNames.user}`,
                    onDelete: "cascade"
                },
                reverse: {
                    on: `$${entityKeys.user}`,
                    has: "one",
                    label: labelNames.user
                }
            }
        }
    } as AuthSchemaReturn<C>
}
