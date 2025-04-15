import { useEffect } from "react"

import type { InstantSchemaDef } from "@instantdb/admin"
import type { InstantReactWebDatabase } from "@instantdb/react"
import type { Session, User } from "better-auth"

export function useInstantAuth({
    db,
    sessionData,
    isPending
}: {
    // biome-ignore lint/suspicious/noExplicitAny:
    db: InstantReactWebDatabase<InstantSchemaDef<any, any, any>>
    sessionData?: { session: Session; user: User } | null
    isPending: boolean
}) {
    const { user, isLoading } = db.useAuth()

    useEffect(() => {
        if (isPending || isLoading) return

        if (sessionData) {
            if (!user || user.id !== sessionData.user.id) {
                db.auth.signInWithToken(sessionData.session.token)
            }
        } else {
            db.auth.signOut({ invalidateToken: false })
        }
    }, [db, isPending, isLoading, sessionData, user])
}
