'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type FormState = 'idle' | 'loading' | 'unconfirmed' | 'resending' | 'resent'

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<FormState>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setState('loading')

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json() as { session?: unknown; error?: string }

      if (!response.ok) {
        if (data.error === 'EMAIL_NOT_CONFIRMED') {
          setState('unconfirmed')
        } else {
          setError(data.error ?? 'Sign in failed. Please try again.')
          setState('idle')
        }
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setState('idle')
    }
  }

  async function handleResend() {
    setError(null)
    setState('resending')

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        setError(data.error ?? 'Failed to resend. Please try again.')
        setState('unconfirmed')
        return
      }

      setState('resent')
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setState('unconfirmed')
    }
  }

  // ── Unconfirmed email state ────────────────────────────────────────────────
  if (state === 'unconfirmed' || state === 'resending' || state === 'resent') {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500" aria-hidden>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>

        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Confirm your email</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            We sent a confirmation link to{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
            {' '}Check your inbox and click the link to activate your account.
          </p>
        </div>

        {state === 'resent' ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Confirmation email resent — check your inbox.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Didn&apos;t receive it?
            </p>
            <button
              onClick={handleResend}
              disabled={state === 'resending'}
              className="w-full py-2 px-4 border border-brand text-brand font-semibold rounded-md hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {state === 'resending' ? 'Sending…' : 'Resend confirmation email'}
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        )}

        <button
          onClick={() => { setState('idle'); setError(null) }}
          className="text-sm text-gray-500 underline hover:no-underline"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  // ── Normal sign-in form ───────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full py-2 px-4 bg-brand text-white font-semibold rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {state === 'loading' ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
