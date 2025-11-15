import type {
  EntitiesDef,
  InstantReactWebDatabase,
  InstantSchemaDef,
  LinksDef,
  RoomsDef
} from "@instantdb/react"
import type { Session } from "better-auth"

export async function instantAuth<
  TSchema extends InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>
>(db: InstantReactWebDatabase<TSchema>, session?: Session) {
  const user = await db.getAuth()

  if (session && user?.id !== session?.userId) {
    db.auth.signInWithToken(session.token)
  }

  if (user && !session) {
    db.auth.signOut()
  }
}
