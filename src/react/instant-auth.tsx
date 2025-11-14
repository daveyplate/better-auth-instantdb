import type { InstantReactWebDatabase } from "@instantdb/react"
import type { MinimalAuthClient, SessionResult } from "./types"
import { useInstantAuth } from "./use-instant-auth"

export function InstantAuth({
  db,
  authClient
}: {
  // biome-ignore lint/suspicious/noExplicitAny: any thing goes
  db: InstantReactWebDatabase<any>
  authClient: MinimalAuthClient<SessionResult>
}) {
  useInstantAuth(db, authClient)

  return null
}
