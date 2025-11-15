/** biome-ignore-all lint/suspicious/noExplicitAny: any thing goes */

import type { InstantReactWebDatabase } from "@instantdb/react"
import type { MinimalAuthClient, SessionResult } from "./types"
import { useInstantAuth } from "./use-instant-auth"

export function InstantAuth<TSessionResult extends SessionResult>({
  db,
  authClient,
  persistent
}: {
  db: InstantReactWebDatabase<any, any>
  authClient: MinimalAuthClient<TSessionResult>
  persistent?: boolean
}) {
  useInstantAuth({ db, authClient, persistent })

  return null
}
