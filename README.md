# Better Auth InstantDB Adapter

A seamless integration between [Better Auth](https://better-auth.com) and [InstantDB](https://www.instantdb.com) that allows you to use InstantDB as your authentication database.

- *Own Your Auth*

𝕏 [@daveycodez](https://x.com/daveycodez)

☕️ [Buy me a coffee](https://buymeacoffee.com/daveycodez)

## Installation

```bash
pnpm add @daveyplate/better-auth-instantdb@latest
```

## Features

- 🔐 **Complete Authentication**: Leverage Better Auth's authentication features with InstantDB as your database
- 🔄 **Session Sync**: Automatically synchronize auth sessions between Better Auth and InstantDB
- 🛠️ **Customizable**: Configure the adapter to match your specific needs
- 🧩 **Type-Safe**: Fully typed with TypeScript for improved developer experience

## Usage

### Basic Setup

First you need to add the InstantDB Adapter to your Better Auth config.

#### auth.ts
```typescript
import { betterAuth } from 'better-auth'
import { instantDBAdapter } from '@daveyplate/better-auth-instantdb'
import { createAdminClient } from '@instantdb/admin'

// Create InstantDB admin client
const adminDb = createAdminClient({
    appId: process.env.INSTANT_APP_ID,
    apiKey: process.env.INSTANT_API_KEY
});

// Create Better Auth instance with InstantDB adapter
export const auth = betterAuth({
    database: instantDBAdapter({
        db: adminDb,
        usePlural: true, // Optional: set to true if your schema uses plural table names
        debugLogs: false  // Optional: set to true to see detailed logs
    }),
    // Other Better Auth configuration options
    emailAndPassword: { enabled: true }
})
```

### Client-Side Usage

Synchronize authentication state between Better Auth and InstantDB:

#### providers.tsx
```typescript
"use client"

import { useSession } from '@/lib/auth-client'
import { init } from '@instantdb/react'
import { useInstantAuth } from '@daveyplate/better-auth-instantdb'

// Initialize InstantDB client
const db = init({ 
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID
})

export function Providers() {
    // Set up InstantDB auth sync with Better Auth
    useInstantAuth({ 
        db, 
        useSession 
    })
    
    return (
        // Your application code
    )
}
```

*Note you can pass useSession hook from [@daveyplate/better-auth-tanstack](https://github.com/daveyplate/better-auth-tanstack). This is recommended for offline caching with a TanStack Query persistClient.*

## InstantDB Schema and Permissions Setup

⚠️ **Important**: You must manually create and configure the InstantDB schema and permissions files for this adapter to work correctly.

### 1. Create Schema File

Create an `instant.schema.ts` file with the required entities for Better Auth:

#### instant.schema.ts
```typescript
import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    // System entities
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.any(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    // Authentication entities
    users: i.entity({
      createdAt: i.date(),
      email: i.string().unique(),
      emailVerified: i.boolean(),
      image: i.string(),
      name: i.string(),
      updatedAt: i.date(),
    }),
    sessions: i.entity({
      createdAt: i.date(),
      expiresAt: i.date().indexed(),
      ipAddress: i.string(),
      token: i.string(),
      updatedAt: i.date(),
      userAgent: i.string(),
      userId: i.string(),
    }),
    accounts: i.entity({
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
      userId: i.string().indexed(),
    }),
    verifications: i.entity({
      createdAt: i.date().indexed(),
      expiresAt: i.date().indexed(),
      identifier: i.string(),
      updatedAt: i.date(),
      value: i.string(),
    }),
    // Optional entities for additional features (public profile example)
    profiles: i.entity({
      createdAt: i.date(),
      image: i.string(),
      name: i.string(),
      updatedAt: i.date(),
    }),
  },
  links: {
    // Required links for auth
    users$user: {
      forward: {
        on: "users",
        has: "one",
        label: "$user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "user",
      },
    },
    sessionsUser: {
      forward: {
        on: "sessions",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "users",
        has: "many",
        label: "sessions",
      },
    },
    accountsUser: {
      forward: {
        on: "accounts",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "users",
        has: "many",
        label: "accounts",
      },
    },
    // Optional links (public profile example)
    profilesUser: {
      forward: {
        on: "profiles",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "users",
        has: "one",
        label: "profile",
      },
    },
    // Add your custom links here
  },
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
```

### 2. Create Permissions File

Create an `instant.perms.ts` file to secure your schema:

```typescript
// instant.perms.ts
import type { InstantRules } from "@instantdb/react";

const rules = {
  // Prevent creation of new attributes without explicit schema changes
  attrs: {
    allow: {
      $default: "false",
    },
  },
  // Auth entities permissions
  users: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "isOwner",
      create: "false",
      delete: "false",
      update: "isOwner && (newData.email == data.email) && (newData.emailVerified == data.emailVerified) && (newData.createdAt == data.createdAt)",
    },
  },
  accounts: {
    bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
    allow: {
      view: "isOwner",
      create: "false",
      delete: "false",
      update: "false",
    },
  },
  sessions: {
    bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
    allow: {
      view: "isOwner",
      create: "false",
      delete: "false",
      update: "false",
    },
  },
  verifications: {
    allow: {
      $default: "false"
    }
  },
  // Optional permissions (public profile example)
  profiles: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "true",
      create: "false",
      delete: "false",
      update: "isOwner",
    },
  },
  // Add your custom entity permissions here
} satisfies InstantRules;

export default rules;
```

### 3. Push Schema and Permissions to InstantDB

After creating these files, use the InstantDB CLI to push them to your app:

```bash
# Push schema
npx instant-cli@latest push schema

# Push permissions
npx instant-cli@latest push perms
```

### 4. Initialize InstantDB with Your Schema

Update your client-side InstantDB initialization to use your schema:

#### /database/instant.ts
```typescript
import { init } from "@instantdb/react"
import schema from "../../instant.schema"

export const db = init({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
    schema, // Add your schema here
    devtool: process.env.NODE_ENV === "development"
})
```

## API Reference

### `instantDBAdapter(options)`

Creates an adapter that allows Better Auth to use InstantDB as its database.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `db` | `InstantAdminDatabase` | (required) | An InstantDB admin client instance |
| `usePlural` | `boolean` | `false` | Set to `true` if your schema uses plural table names |
| `debugLogs` | `boolean` | `false` | Set to `true` to enable detailed logging |
| `transactionHooks` | `Promise<TransactionChunk<any, any>[]>` | `undefined` | Custom hooks for create and update operations |

### `useInstantAuth({ db, useSession })`

A React hook that synchronizes authentication state between Better Auth and InstantDB.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `db` | `InstantReactWebDatabase` | An InstantDB client instance |
| `useSession` | `function` | The `useSession` hook from Better Auth |

## Advanced Usage

### Custom Transaction Hooks

You can extend the adapter's behavior with custom transaction hooks:

#### Sync public profile with user entity
```typescript
instantDBAdapter({
    db,
    usePlural: true,
    transactionHooks: {
        create: async ({ model, data }) => {
            if (model === "users") {
                const transactions = [
                    db.tx.profiles[data.id]
                        .update({
                            name: data.name,
                            image: data.image,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        })
                        .link({ user: data.id })
                ]

                return transactions
            }
        },
        update: async ({ model, update, where }) => {
            if (model === "users") {
                const result = await db.query({ profiles: { $: { where: parseWhere(where) } } })

                return result.profiles.map((profile) =>
                    db.tx.profiles[profile.id].update({
                        name: update.name,
                        image: update.image,
                        updatedAt: Date.now()
                    })
                )
            }
        }
    }
})
```

## License

MIT