import type { AuthUser } from '@/types/auth'

// Mock must be before imports that use it
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

// Mock next/headers for server client
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  }),
}))

import { POST } from '@/app/api/auth/sign-up/route'
import { NextRequest } from 'next/server'

const mockUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
}

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/sign-up', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 201 with user on successful sign up', async () => {
    mockSignUp.mockResolvedValue(mockUser)

    const request = createRequest({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    })

    const response = await POST(request)
    const data = await response.json() as { user: AuthUser }

    expect(response.status).toBe(201)
    expect(data.user).toEqual(mockUser)
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

  it('returns 409 when email is already registered', async () => {
    mockSignUp.mockRejectedValue(new Error('User already registered'))

    const request = createRequest({
      email: 'existing@example.com',
      password: 'password123',
    })

    const response = await POST(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(409)
    expect(data.error).toBeTruthy()
  })

  it('returns 500 on unexpected error', async () => {
    mockSignUp.mockRejectedValue(new Error('Database connection failed'))

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
