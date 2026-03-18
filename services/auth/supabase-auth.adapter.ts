import type { SupabaseClient, User } from '@supabase/supabase-js'
import type {
  AuthUser,
  AuthSession,
  SignUpPayload,
  SignInPayload,
  IAuthService,
} from '@/types/auth'

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.display_name as string | undefined),
    avatarUrl: user.user_metadata?.avatar_url as string | undefined,
  }
}

export class SupabaseAuthAdapter implements IAuthService {
  constructor(private readonly supabase: SupabaseClient) {}

  async signUp(payload: SignUpPayload): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.displayName,
        },
      },
    })

    if (error) {
      throw error
    }

    if (!data.user) {
      throw new Error('Sign up failed: no user returned')
    }

    return mapUser(data.user)
  }

  async signIn(payload: SignInPayload): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    })

    if (error) {
      throw error
    }

    if (!data.user || !data.session) {
      throw new Error('Sign in failed: no session returned')
    }

    return {
      user: mapUser(data.user),
      accessToken: data.session.access_token,
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.supabase.auth.getSession()

    if (error || !data.session) {
      return null
    }

    return {
      user: mapUser(data.session.user),
      accessToken: data.session.access_token,
    }
  }

  async getUser(): Promise<AuthUser | null> {
    const { data, error } = await this.supabase.auth.getUser()

    if (error || !data.user) {
      return null
    }

    return mapUser(data.user)
  }
}
