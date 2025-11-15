import { useEffect } from "react"

import type { MinimalAuthClient, SessionResult } from "./types"
import { useHydrated } from "./use-hydrated"

let lastPersisted: any | undefined | null
let restoredData: any | undefined | null

export function usePersistentSession<
  TSessionResult extends SessionResult,
  TAuthClient extends MinimalAuthClient<TSessionResult>
>(authClient: TAuthClient) {
  const { data, isPending, isRefetching, error, ...rest } =
    authClient.useSession()
  const hydrated = useHydrated()

  useEffect(() => {
    if (isPending) return

    const persistSession = () => {
      if (!data || lastPersisted?.session.id === data?.session.id) return

      lastPersisted = data
      localStorage.setItem("ba-instant-session", JSON.stringify(data))
    }

    const unpersistSession = () => {
      if (data || error || (lastPersisted === null && restoredData === null))
        return

      localStorage.removeItem("ba-instant-session")
      lastPersisted = null
      restoredData = null
    }

    persistSession()
    unpersistSession()
  }, [data, isPending, error])

  if (hydrated && !data) {
    if (restoredData === undefined) {
      const persisted = localStorage.getItem("ba-instant-session")

      if (persisted) {
        const data = JSON.parse(persisted) as TSessionResult
        restoredData = data
      } else {
        restoredData = null
      }
    }

    if (restoredData) {
      return {
        data: restoredData,
        isPending: false,
        isRefetching: false,
        error: null,
        ...rest
      } as TSessionResult
    }
  }

  return { data, isPending, isRefetching, error, ...rest }
}
