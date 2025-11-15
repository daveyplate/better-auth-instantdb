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
    const user = data.$users[0]

    if (sessionData?.user?.id === user.id) {
      sessionData.user = user as typeof sessionData.user
    }
  }

  return {
    data: !authError && !authPending ? sessionData : null,
    isPending: authPending || isPending,
    isRefetching: authPending || isRefetching,
    error: (authError as BetterFetchError) || error,
    ...rest
  }
}
