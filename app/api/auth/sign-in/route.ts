import { NextRequest, NextResponse } from 'next/server'
import { createAuthService } from '@/services/auth/auth.service'
import type { SignInPayload } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<SignInPayload>

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const authService = await createAuthService()
    const session = await authService.signIn({
      email: body.email,
      password: body.password,
    })

    return NextResponse.json({ session }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (
        message.includes('invalid') ||
        message.includes('invalid login credentials') ||
        message.includes('wrong password') ||
        message.includes('not found') ||
        message.includes('email not confirmed')
      ) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
