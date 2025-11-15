import type {
  EntitiesDef,
  InstantReactWebDatabase,
  InstantSchemaDef,
  LinksDef,
  RoomsDef
} from "@instantdb/react"
import type { MinimalAuthClient, SessionResult } from "./types"
import { useInstantAuth } from "./use-instant-auth"

export function InstantAuth<
  TSchema extends InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>
>({
  db,
  authClient
}: {
  db: InstantReactWebDatabase<TSchema>
  authClient: MinimalAuthClient<SessionResult>
}) {
  useInstantAuth(db, authClient)

  return null
}
