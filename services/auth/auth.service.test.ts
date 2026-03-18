import type { IAuthService, AuthUser, AuthSession, SignUpPayload, SignInPayload } from '@/types/auth'

// Mock the Supabase server client module
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock the adapter
jest.mock('./supabase-auth.adapter')

import { createAuthService } from './auth.service'
import { SupabaseAuthAdapter } from './supabase-auth.adapter'

const MockedSupabaseAuthAdapter = SupabaseAuthAdapter as jest.MockedClass<typeof SupabaseAuthAdapter>

const mockUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
}

const mockSession: AuthSession = {
  user: mockUser,
  accessToken: 'access-token-abc',
}

describe('createAuthService', () => {
  let service: IAuthService
  let mockAdapter: jest.Mocked<IAuthService>

  beforeEach(async () => {
    jest.clearAllMocks()

    mockAdapter = {
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
    }

    MockedSupabaseAuthAdapter.mockImplementation(() => mockAdapter as unknown as SupabaseAuthAdapter)

    service = await createAuthService()
  })

  describe('signUp', () => {
    it('returns AuthUser on successful sign up', async () => {
      const payload: SignUpPayload = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      }
      mockAdapter.signUp.mockResolvedValue(mockUser)

      const result = await service.signUp(payload)

      expect(result).toEqual(mockUser)
      expect(mockAdapter.signUp).toHaveBeenCalledWith(payload)
    })

    it('throws an error when email is already registered', async () => {
      const payload: SignUpPayload = {
        email: 'existing@example.com',
        password: 'password123',
      }
      const error = new Error('User already registered')
      mockAdapter.signUp.mockRejectedValue(error)

      await expect(service.signUp(payload)).rejects.toThrow('User already registered')
    })
  })

  describe('signIn', () => {
    it('returns AuthSession on successful sign in', async () => {
      const payload: SignInPayload = {
        email: 'test@example.com',
        password: 'password123',
      }
      mockAdapter.signIn.mockResolvedValue(mockSession)

      const result = await service.signIn(payload)

      expect(result).toEqual(mockSession)
      expect(mockAdapter.signIn).toHaveBeenCalledWith(payload)
    })

    it('throws an error on invalid credentials', async () => {
      const payload: SignInPayload = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }
      const error = new Error('Invalid login credentials')
      mockAdapter.signIn.mockRejectedValue(error)

      await expect(service.signIn(payload)).rejects.toThrow('Invalid login credentials')
    })
  })

  describe('signOut', () => {
    it('resolves without error', async () => {
      mockAdapter.signOut.mockResolvedValue(undefined)

      await expect(service.signOut()).resolves.toBeUndefined()
      expect(mockAdapter.signOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('getSession', () => {
    it('returns AuthSession when session exists', async () => {
      mockAdapter.getSession.mockResolvedValue(mockSession)

      const result = await service.getSession()

      expect(result).toEqual(mockSession)
    })

    it('returns null when no session exists', async () => {
      mockAdapter.getSession.mockResolvedValue(null)

      const result = await service.getSession()

      expect(result).toBeNull()
    })
  })

  describe('getUser', () => {
    it('returns AuthUser when logged in', async () => {
      mockAdapter.getUser.mockResolvedValue(mockUser)

      const result = await service.getUser()

      expect(result).toEqual(mockUser)
    })

    it('returns null when not logged in', async () => {
      mockAdapter.getUser.mockResolvedValue(null)

      const result = await service.getUser()

      expect(result).toBeNull()
    })
  })
})
