import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthService } from '@/services/auth/auth.service'
import { signUpLimiter } from '@/lib/rate-limiter'

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  // Rate limit by IP address
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const rateLimit = signUpLimiter.check(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter) },
      }
    )
  }

  try {
    const rawBody = await request.json()
    const parsed = signUpSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }
    const body = parsed.data

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
