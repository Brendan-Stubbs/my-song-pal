import { NextResponse } from 'next/server'
import { createAuthService } from '@/services/auth/auth.service'

export async function POST() {
  try {
    const authService = await createAuthService()
    await authService.signOut()
    return NextResponse.json({ message: 'Signed out successfully' }, { status: 200 })
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
