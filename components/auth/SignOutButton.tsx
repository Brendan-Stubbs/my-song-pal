'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignOut() {
    setIsLoading(true)
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' })
      router.push('/sign-in')
      router.refresh()
    } catch {
      // Even if the request fails, redirect to sign-in
      router.push('/sign-in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="py-2 px-4 bg-brand text-white font-semibold rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
    >
      {isLoading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
