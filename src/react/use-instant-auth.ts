/** biome-ignore-all lint/suspicious/noExplicitAny: any thing goes */

import type { InstantReactWebDatabase } from "@instantdb/react"
import type { Session } from "better-auth/types"
import { useCallback, useEffect } from "react"
import type { MinimalAuthClient, SessionResult } from "./types"

export function useInstantAuth<
  TAuthClient extends MinimalAuthClient<TSessionResult>,
  TSessionResult extends SessionResult
>(db: InstantReactWebDatabase<any>, authClient: TAuthClient) {
  const { isPending, data } = authClient.useSession()

  const handleAuthStateChange = useCallback(
    async (session?: Session) => {
      const user = await db.getAuth()

      if (session && user?.id !== session?.userId) {
        db.auth.signInWithToken(session.token)
      }

      if (user && !session) {
        db.auth.signOut()
      }
    },
    [db]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (isPending) return

    handleAuthStateChange(data?.session)
  }, [data?.user.id])
}
