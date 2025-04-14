import { i } from "@instantdb/react"
import type { AuthPluginFactory } from "../auth-schema"

// Define the anonymousPlugin as a factory function
export const anonymousPlugin: AuthPluginFactory = (config) => ({
    name: "anonymous",
    extendEntities: {
        user: {
            isAnonymous: i.boolean()
        }
    }
})
