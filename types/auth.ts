export interface AuthUser {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
}

export interface SignUpPayload {
  email: string
  password: string
  displayName?: string
}

export interface SignInPayload {
  email: string
  password: string
}

export interface IAuthService {
  signUp(payload: SignUpPayload): Promise<AuthUser>
  signIn(payload: SignInPayload): Promise<AuthSession>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession | null>
  getUser(): Promise<AuthUser | null>
}
