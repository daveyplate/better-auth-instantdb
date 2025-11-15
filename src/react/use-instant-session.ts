/** biome-ignore-all lint/suspicious/noExplicitAny: ignore */

import type { Config } from "@instantdb/admin"
import type { User } from "@instantdb/core"
import type { InstantReactWebDatabase } from "@instantdb/react"
import type { BetterFetchError } from "better-auth/react"
import type { MinimalAuthClient, SessionResult } from "./types"

export function useInstantSession<
  TSessionResult extends SessionResult,
  TAuthClient extends MinimalAuthClient<TSessionResult>
>(db: InstantReactWebDatabase<any, Config>, authClient: TAuthClient) {
  const {
    data: sessionData,
    isPending,
    error,
    isRefetching,
    ...rest
  } = authClient.useSession()

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
