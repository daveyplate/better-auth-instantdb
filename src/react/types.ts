import type { Session, User } from "better-auth/types"

export type SessionResult = {
  isPending: boolean
  data: {
    session: Session
    user: User
  } | null
}

export type MinimalAuthClient<TSessionResult extends SessionResult> = {
  useSession: () => TSessionResult
}
