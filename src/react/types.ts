import type { createAuthClient } from "better-auth/react"

export type SessionResult = ReturnType<AuthClient["useSession"]>

export type MinimalAuthClient<TSessionResult extends SessionResult> = {
  useSession: () => TSessionResult
}

export type AuthClient = ReturnType<typeof createAuthClient>
