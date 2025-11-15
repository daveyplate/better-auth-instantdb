import type { InstantCoreDatabase } from "@instantdb/core"
import type {
  EntitiesDef,
  InstantReactWebDatabase,
  InstantSchemaDef,
  LinksDef,
  RoomsDef
} from "@instantdb/react"
import { useEffect } from "react"
import { instantAuth } from "../shared/instant-auth"
import type { MinimalAuthClient, SessionResult } from "./types"
import { usePersistentSession } from "./use-persistent-session"

export function useInstantAuth<
  TSchema extends InstantSchemaDef<
    EntitiesDef,
    LinksDef<EntitiesDef>,
    RoomsDef
  >,
  TAuthClient extends MinimalAuthClient<TSessionResult>,
  TSessionResult extends SessionResult
>(db: InstantReactWebDatabase<TSchema>, authClient: TAuthClient) {
  const { isPending, data } = usePersistentSession(authClient)

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (isPending) return

    instantAuth(db as unknown as InstantCoreDatabase<TSchema>, data?.session)
  }, [data?.user.id])
}
