/** biome-ignore-all lint/suspicious/noExplicitAny: any thing goes */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: ignore */

import type { User } from "@instantdb/core"
import type { BetterFetchError } from "better-auth/react"
import type { SessionResult } from "./types"
import type { InstantAuthProps } from "./use-instant-auth"
import { usePersistentSession } from "./use-persistent-session"

export function useInstantSession<TSessionResult extends SessionResult>({
  db,
  authClient,
  persistent
}: InstantAuthProps<TSessionResult>) {
  const {
    data: sessionData,
    isPending,
    error,
    isRefetching,
    ...rest
  } = persistent ? usePersistentSession(authClient) : authClient.useSession()

  const { user: authUser, error: authError } = db.useAuth()
  const authPending = sessionData && !authUser && !authError

  const { data } = db.useQuery(
    authUser
      ? {
          $users: { $: { where: { id: authUser.id } } }
        }
      : null
  )

  if (data?.$users?.length) {
    const user = data.$users[0] as User

    if (sessionData?.user?.id === user.id) {
      sessionData.user = user as any
    }
  }

  return {
    data: !authError ? sessionData : null,
    isPending: authPending || isPending,
    isRefetching: authPending || isRefetching,
    error: (authError as BetterFetchError) || error,
    ...rest
  }
}
