import type {
  EntitiesDef,
  InstantReactWebDatabase,
  InstantSchemaDef,
  LinksDef,
  RoomsDef
} from "@instantdb/react"
import { useEffect } from "react"
import { instantAuth } from "../instant-auth"
import type { MinimalAuthClient, SessionResult } from "./types"

export function useInstantAuth<
  TSchema extends InstantSchemaDef<
    EntitiesDef,
    LinksDef<EntitiesDef>,
    RoomsDef
  >,
  TAuthClient extends MinimalAuthClient<TSessionResult>,
  TSessionResult extends SessionResult
>(db: InstantReactWebDatabase<TSchema>, authClient: TAuthClient) {
  const { isPending, data } = authClient.useSession()

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (isPending) return

    instantAuth(db, data?.session)
  }, [data?.user.id])
}
