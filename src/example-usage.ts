import { i } from "@instantdb/react"
import {
    type AuthPlugin,
    anonymousPlugin,
    createAuthSchema,
    passkeyPlugin,
    usernamePlugin
} from "./auth-schema"

// Example 1: Basic schema with default settings (usePlural: false)
const basicSchema = createAuthSchema({})
// Has link keys: accountUser, sessionUser, user$User

// Example 2: Explicitly set usePlural to true
const pluralSchema = createAuthSchema({
    usePlural: true
})
// Has link keys: accountsUser, sessionsUser, users$User

// Example 3: Using a single plugin
const schemaWithPlugin = createAuthSchema({
    plugins: [anonymousPlugin()]
})

// Example 4: Customizing model names
const customNameSchema = createAuthSchema({
    namespaces: {
        user: { modelName: "member" }
    }
})
// Has link keys: accountMember, sessionMember, member$Member

// Example 5: Configuring plugins
const advancedSchema = createAuthSchema({
    usePlural: true,
    namespaces: {
        user: { modelName: "member" },
        account: {
            modelName: "credential",
            fields: { providerId: "provider" }
        }
    },
    plugins: [
        // Simple plugin without config
        anonymousPlugin(),

        // Plugin with custom config
        [
            passkeyPlugin,
            {
                modelName: "securityKey",
                fields: {
                    deviceType: "keyType", // Rename field
                    counter: "sequence" // Rename another field
                },
                additionalFields: {
                    lastUsed: { type: "date", indexed: true },
                    notes: { type: "string" }
                }
            }
        ]
    ]
})
// Has link keys: credentialsMember, sessionsMember, members$Member, securityKeysUser

// Access schema entities and links
console.log("Basic schema entities:", Object.keys(basicSchema.entities))
console.log("Basic schema links:", Object.keys(basicSchema.links))

console.log("Advanced schema entities:", Object.keys(advancedSchema.entities))
console.log("Advanced schema links:", Object.keys(advancedSchema.links))

// TypeScript will provide proper autocomplete for both standard and dynamic keys
const userEntity = advancedSchema.entities.members
const accountUser = advancedSchema.links.credentialsMember
const passkeyLink = advancedSchema.links.securityKeysUser

// Example 6: Custom plugin creation
const customPlugin: AuthPlugin = {
    name: "custom",
    extendEntities: {
        user: {
            favoriteColor: i.string(),
            dateOfBirth: i.date()
        }
    },
    entities: {
        preference: {
            id: i.string(),
            userId: i.string().indexed(),
            key: i.string(),
            value: i.string(),
            createdAt: i.date(),
            updatedAt: i.date()
        }
    },
    links: {
        preferencesUser: {
            forward: {
                on: "preferences",
                has: "one",
                label: "user",
                onDelete: "cascade"
            },
            reverse: {
                on: "users", // Will be dynamically replaced with the actual user entity name
                has: "many",
                label: "preferences"
            }
        }
    }
}

// Use the custom plugin with others
const customSchema = createAuthSchema({
    usePlural: true,
    plugins: [anonymousPlugin(), usernamePlugin(), customPlugin]
})
