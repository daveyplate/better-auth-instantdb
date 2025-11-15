import type { InstantCoreDatabase } from "@instantdb/core"
import type { InstantReactWebDatabase } from "@instantdb/react"
import type { Session } from "better-auth"

export async function instantAuth(
  db: InstantCoreDatabase<any, any> | InstantReactWebDatabase<any, any>,
  session?: Session
) {
  const user = await db.getAuth()

  if (session && user?.id !== session?.userId) {
    db.auth.signInWithToken(session.token)
  }

  if (!session && user) {
    db.auth.signOut()
  }
}
