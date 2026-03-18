import { NextRequest, NextResponse } from 'next/server'
import { createAuthService } from '@/services/auth/auth.service'
import type { SignUpPayload } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<SignUpPayload>

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const authService = await createAuthService()
    const user = await authService.signUp({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (
        message.includes('already registered') ||
        message.includes('already exists') ||
        message.includes('duplicate') ||
        message.includes('unique')
      ) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
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
