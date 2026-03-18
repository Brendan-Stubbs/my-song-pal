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

import { POST } from '@/app/api/auth/sign-out/route'
import { NextRequest } from 'next/server'

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/auth/sign-out', {
    method: 'POST',
  })
}

describe('POST /api/auth/sign-out', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 on successful sign out', async () => {
    mockSignOut.mockResolvedValue(undefined)

    const response = await POST()
    const data = await response.json() as { message: string }

    expect(response.status).toBe(200)
    expect(data.message).toBeTruthy()
  })

  it('returns 200 even when called without an active session', async () => {
    mockSignOut.mockResolvedValue(undefined)

    const response = await POST()

    expect(response.status).toBe(200)
  })

  it('returns 500 when sign out throws an error', async () => {
    mockSignOut.mockRejectedValue(new Error('Sign out failed'))

    const response = await POST()
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toBeTruthy()
  })
})
