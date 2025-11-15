/** biome-ignore-all lint/correctness/useHookAtTopLevel: ignore */
/** biome-ignore-all lint/suspicious/noExplicitAny: any thing goes */

import type { InstantCoreDatabase } from "@instantdb/core"
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (isPending) return

    instantAuth(db as unknown as InstantCoreDatabase<any>, data?.session)
  }, [data?.user.id])
}
