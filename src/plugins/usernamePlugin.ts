import { i } from "@instantdb/react"
import type { AuthPluginFactory } from "../auth-schema"

// Define the usernamePlugin as a factory function
export const usernamePlugin: AuthPluginFactory = (config) => ({
    name: "username",
    extendEntities: {
        user: {
            username: i.string().unique(),
            displayUsername: i.string().unique()
        }
    }
})
