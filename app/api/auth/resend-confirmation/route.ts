import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { signInLimiter } from '@/lib/rate-limiter'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  // Reuse the sign-in rate limiter to prevent abuse
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const rateLimit = signInLimiter.check(ip)
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
    const parsed = schema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: parsed.data.email,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Always return 200 even if the email doesn't exist — avoids email enumeration
    return NextResponse.json({ message: 'Confirmation email sent' }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
