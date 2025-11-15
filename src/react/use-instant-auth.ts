import type { InstantReactWebDatabase } from "@instantdb/react"
import { useEffect } from "react"

import { instantAuth } from "../shared/instant-auth"
import type { MinimalAuthClient, SessionResult } from "./types"
import { usePersistentSession } from "./use-persistent-session"

export interface InstantAuthProps<TSessionResult extends SessionResult> {
  db: InstantReactWebDatabase<any, any>
  authClient: MinimalAuthClient<TSessionResult>
  persistent?: boolean
}

export function useInstantAuth<TSessionResult extends SessionResult>({
  db,
  authClient,
  persistent
}: InstantAuthProps<TSessionResult>) {
  const { isPending, data } = persistent
    ? usePersistentSession(authClient)
    : authClient.useSession()

  useEffect(() => {
    if (isPending) return

    instantAuth(db, data?.session)
  }, [db, isPending, data?.session])
}
