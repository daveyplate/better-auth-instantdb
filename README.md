# Better Auth InstantDB Adapter

A seamless integration between [Better Auth](https://better-auth.com) and [InstantDB](https://www.instantdb.com) that allows you to use InstantDB as your authentication database.

[Better Auth UI Integration](https://better-auth-ui.com/data/instantdb)

- _Own Your Auth_

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

## Table of Contents

- Getting Started
- API Reference
- Advanced Usage
- License

## Getting Started

This guide walks you through setting up the Better Auth InstantDB adapter with the Next.js starter project.

### Prerequisites

- Node.js and pnpm installed (npm, yarn, etc should work but aren't tested)
- An InstantDB account

### Step-by-Step Guide

1.  **Clone the Starter Project**

    ```bash
    git clone https://github.com/daveyplate/better-auth-nextjs-starter/ your-project-name
    cd your-project-name
    ```

2.  **Initial Setup & Dependencies**

    Rename `.env.example` to `.env.local`.

    Add your `BETTER_AUTH_SECRET` You can generate a `BETTER_AUTH_SECRET` [here](https://www.better-auth.com/docs/installation#set-environment-variables).

    Set `NEXT_PUBLIC_BASE_URL=http://localhost:3000`.

    Add the following to your `.env.local` file.

    ```bash
    INSTANT_APP_ID=""
    NEXT_PUBLIC_INSTANT_APP_ID=""
    INSTANT_API_KEY=""
    ```

    You will find the variables in the InstantDB Dashboard:

    `INSTANT_APP_ID`= Public App ID in the `Explorer` Tab

    `NEXT_PUBLIC_INSTANT_APP_ID`= (Same as above)

    `INSTANT_API_KEY`= Secret Key in the `Admin` Tab

3.  **Install Adapter and InstantDB Packages**

    Install base dependencies:

    ```bash
    pnpm add @daveyplate/better-auth-instantdb@latest
    pnpm add @instantdb/react @instantdb/admin
    ```

4.  **Create InstantDB Schema and Permissions Files**

    ⚠️ **Important**: You must manually create and configure the InstantDB schema and permissions files for this adapter to work correctly.

    Create the following files in the root of your project:

    #### `instant.schema.ts`

    ```typescript
    import { i } from "@instantdb/react";

    const _schema = i.schema({
      entities: {
        // System entities
        $files: i.entity({
          path: i.string().unique().indexed().optional(),
          url: i.any().optional(),
        }),
        $users: i.entity({
          email: i.string().unique().indexed(),
        }),
        // Authentication entities
        users: i.entity({
          createdAt: i.date(),
          email: i.string().unique(),
          emailVerified: i.boolean(),
          image: i.string().optional(),
          name: i.string(),
          updatedAt: i.date(),
        }),
        sessions: i.entity({
          createdAt: i.date(),
          expiresAt: i.date().indexed(),
          ipAddress: i.string().optional(),
          token: i.string(),
          updatedAt: i.date(),
          userAgent: i.string(),
          userId: i.string(),
        }),
        accounts: i.entity({
          accessToken: i.string().optional(),
          accessTokenExpiresAt: i.date().optional(),
          accountId: i.string(),
          createdAt: i.date(),
          idToken: i.string().optional(),
          password: i.string(),
          providerId: i.string(),
          refreshToken: i.string().optional(),
          refreshTokenExpiresAt: i.date().optional(),
          scope: i.string().optional(),
          updatedAt: i.date(),
          userId: i.string().indexed(),
        }),
        verifications: i.entity({
          createdAt: i.date().indexed().optional(),
          expiresAt: i.date().indexed().optional(),
          identifier: i.string().optional(),
          updatedAt: i.date().optional(),
          value: i.string().optional(),
        }),
        // Optional entities for additional features (public profile example)
        profiles: i.entity({
          createdAt: i.date().optional(),
          image: i.string().optional(),
          name: i.string().optional(),
          updatedAt: i.date().optional(),
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
          reverse: { on: "$users", has: "one", label: "user" },
        },
        sessionsUser: {
          forward: {
            on: "sessions",
            has: "one",
            label: "user",
            onDelete: "cascade",
          },
          reverse: { on: "users", has: "many", label: "sessions" },
        },
        accountsUser: {
          forward: {
            on: "accounts",
            has: "one",
            label: "user",
            onDelete: "cascade",
          },
          reverse: { on: "users", has: "many", label: "accounts" },
        },
        // Optional links (public profile example)
        profilesUser: {
          forward: {
            on: "profiles",
            has: "one",
            label: "user",
            onDelete: "cascade",
          },
          reverse: { on: "users", has: "one", label: "profile" },
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

    #### `instant.perms.ts`

    ```typescript
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
          update:
            "isOwner && (newData.email == data.email) && (newData.emailVerified == data.emailVerified) && (newData.createdAt == data.createdAt)",
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
          $default: "false",
        },
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

5.  **Initialize InstantDB Project**

    Go to the [InstantDB Explorer](https://instantdb.com/dash) and create a new app in the top left corner. Note your App ID and generate an Secret Key if one isn't created in the Admin tab.
    Initialize the InstantDB CLI in your project:

    ```bash
    npx instant-cli@latest init
    ```

    Follow the prompts: select your existing app, confirm using your `.env` file (it will create/update `.env` with `INSTANT_APP_ID`), and choose not to overwrite existing files if prompted for `instant.schema.ts` or `instant.perms.ts`.

6.  **Push Schema and Permissions to InstantDB**

    ```bash
    npx instant-cli@latest push schema
    npx instant-cli@latest push perms
    ```

    If you make changes to `instant.schema.ts` later, remember to run `npx instant-cli@latest push schema` again.

7.  **Configure Better Auth Adapter**

    Update your Better Auth configuration file in `lib/auth.ts`.

    #### `auth.ts`

    ```typescript
    import { betterAuth } from "better-auth";
    import { instantDBAdapter } from "@daveyplate/better-auth-instantdb";
    import { init } from "@instantdb/admin";
    import schema, { AppSchema } from "./../instant.schema";

    // Create InstantDB admin client
    const adminDb = init({
      appId: process.env.INSTANT_APP_ID as string,
      adminToken: process.env.INSTANT_API_KEY as string,
      schema: schema as AppSchema,
    });

    // Create Better Auth instance with InstantDB adapter
    export const auth = betterAuth({
      database: instantDBAdapter({
        db: adminDb,
        usePlural: true, // Optional: set to true if your schema uses plural table names
        debugLogs: false, // Optional: set to true to see detailed logs
      }),
      // Other Better Auth configuration options
      emailAndPassword: { enabled: true },
    });
    ```

8.  **Update Client-Side Auth**

    Synchronize authentication state between Better Auth and InstantDB:

    In your client-side auth setup file `lib/auth-client.ts`, ensure `useSession` is exported:

    #### `auth-client.ts`

    ```typescript
    import { createAuthClient } from "better-auth/client";

    export const { useSession } = createAuthClient();
    // ... rest of the file
    ```

9.  **Set up Client-Side InstantDB Integration**

    Update your providers file `app/providers.tsx` to synchronize Better Auth state with InstantDB.

    #### `providers.tsx`

    ```typescript
    "use client";

    import { useSession } from "@/lib/auth-client";
    import { init } from "@instantdb/react";
    import { useInstantAuth } from "@daveyplate/better-auth-instantdb";

    // Initialize InstantDB client
    const db = init({
      appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
    });

    export function Providers({ children }: { children: React.ReactNode }) {
      const { data: sessionData, isPending } = useSession();

      // Set up InstantDB auth sync with Better Auth
      useInstantAuth({
        db,
        sessionData,
        isPending,
      });

      return (
        // Your application code
        { children }
      );
    }
    ```

10. **Run the Development Server**
    ```bash
    pnpm dev
    ```
    Try creating a new user by clicking the User icon in the top right corner and Sign Up.

You should now have a working integration!

---

## API Reference

### `instantDBAdapter(options)`

Creates an adapter that allows Better Auth to use InstantDB as its database.

#### Options

| Option             | Type                                    | Default     | Description                                             |
| ------------------ | --------------------------------------- | ----------- | ------------------------------------------------------- |
| `db`               | `InstantAdminDatabase`                  | (required)  | An InstantDB admin client instance                      |
| `usePlural`        | `boolean`                               | `true`      | Set to `false` if your schema uses singular table names |
| `debugLogs`        | `boolean`                               | `false`     | Set to `true` to enable detailed logging                |
| `transactionHooks` | `Promise<TransactionChunk<any, any>[]>` | `undefined` | Custom hooks for create and update operations           |

### `useInstantAuth({ db, useSession })`

A React hook that synchronizes authentication state between Better Auth and InstantDB.

#### Parameters

| Parameter    | Type                      | Description                            |
| ------------ | ------------------------- | -------------------------------------- |
| `db`         | `InstantReactWebDatabase` | An InstantDB client instance           |
| `useSession` | `function`                | The `useSession` hook from Better Auth |

### `useInstantAuth({ db, sessionData, isPending })`

An alternative form of the React hook that synchronizes authentication state between Better Auth and InstantDB.

#### Parameters

| Parameter     | Type                                       | Description                               |
| ------------- | ------------------------------------------ | ----------------------------------------- |
| `db`          | `InstantReactWebDatabase`                  | An InstantDB client instance              |
| `sessionData` | `{ session: Session; user: User } \| null` | Session data from Better Auth             |
| `isPending`   | `boolean`                                  | Whether the session data is still loading |

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
              updatedAt: Date.now(),
            })
            .link({ user: data.id }),
        ];

        return transactions;
      }
    },
    update: async ({ model, update, where }) => {
      if (model === "users") {
        const result = await db.query({
          profiles: { $: { where: parseWhere(where) } },
        });

        return result.profiles.map((profile) =>
          db.tx.profiles[profile.id].update({
            name: update.name,
            image: update.image,
            updatedAt: Date.now(),
          })
        );
      }
    },
  },
});
```

## License

MIT
