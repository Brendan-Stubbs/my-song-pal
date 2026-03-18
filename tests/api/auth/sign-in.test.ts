import type { AuthSession } from '@/types/auth'

const mockSignUp = jest.fn()
const mockSignIn = jest.fn()
const mockSignOut = jest.fn()
const mockGetSession = jest.fn()
const mockGetUser = jest.fn()

jest.mock('@/services/auth/auth.service', () => ({
  createAuthService: jest.fn().mockResolvedValue({
    signUp: mockSignUp,
    signIn: mockSignIn,
    signOut: mockSignOut,
    getSession: mockGetSession,
    getUser: mockGetUser,
  }),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  }),
}))

import { POST } from '@/app/api/auth/sign-in/route'
import { NextRequest } from 'next/server'

const mockSession: AuthSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  accessToken: 'access-token-abc',
}

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/sign-in', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 with session on successful sign in', async () => {
    mockSignIn.mockResolvedValue(mockSession)

    const request = createRequest({
      email: 'test@example.com',
      password: 'password123',
    })

    const response = await POST(request)
    const data = await response.json() as { session: AuthSession }

    expect(response.status).toBe(200)
    expect(data.session).toEqual(mockSession)
  })

  it('returns 401 on invalid credentials', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'))

    const request = createRequest({
      email: 'test@example.com',
      password: 'wrongpassword',
    })

    const response = await POST(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(401)
    expect(data.error).toBeTruthy()
  })

  it('returns 400 when email is missing', async () => {
    const request = createRequest({ password: 'password123' })

    const response = await POST(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toBeTruthy()
  })

  it('returns 400 when password is missing', async () => {
    const request = createRequest({ email: 'test@example.com' })

    const response = await POST(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toBeTruthy()
  })

  it('returns 500 on unexpected server error', async () => {
    mockSignIn.mockRejectedValue(new Error('Unexpected error'))

    const request = createRequest({
      email: 'test@example.com',
      password: 'password123',
    })

    const response = await POST(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toBeTruthy()
  })
})
