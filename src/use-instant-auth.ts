import { useEffect } from "react"

import type { InstantSchemaDef } from "@instantdb/admin"
import type { InstantReactWebDatabase } from "@instantdb/react"
import type { Session, User } from "better-auth"

type UseSession = () => {
    data?: { session: Session; user: User } | null
    isPending: boolean
}

export function useInstantAuth({
    db,
    useSession
}: {
    // biome-ignore lint/suspicious/noExplicitAny:
    db: InstantReactWebDatabase<InstantSchemaDef<any, any, any>>
    useSession: UseSession
}) {
    const { data: sessionData, isPending } = useSession()
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
