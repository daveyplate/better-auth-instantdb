import { useSyncExternalStore } from "react"

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

function subscribe() {
  return () => {}
}
