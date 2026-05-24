'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

// ── Password strength ─────────────────────────────────────────────────────────

interface StrengthRule {
  label: string
  test: (pw: string) => boolean
}

const RULES: StrengthRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
]

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const passed = RULES.filter((r) => r.test(password)).length
  const strengthLabel = passed === 3 ? 'Strong' : passed === 2 ? 'Medium' : 'Weak'
  const barColour =
    passed === 3
      ? 'bg-green-500'
      : passed === 2
        ? 'bg-yellow-400'
        : 'bg-red-400'

  return (
    <div className="mt-2 space-y-2">
      {/* Segmented bar */}
      <div className="flex gap-1">
        {RULES.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < passed ? barColour : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Strength:{' '}
        <span
          className={
            passed === 3
              ? 'text-green-600 dark:text-green-400 font-medium'
              : passed === 2
                ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                : 'text-red-600 dark:text-red-400 font-medium'
          }
        >
          {strengthLabel}
        </span>
      </p>
      {/* Per-rule checklist */}
      <ul className="space-y-0.5">
        {RULES.map((rule) => {
          const ok = rule.test(password)
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-xs ${
                ok
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <svg
                width="12" height="12" viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {ok ? (
                  <polyline points="1.5,6 4.5,9.5 10.5,2.5" />
                ) : (
                  <>
                    <line x1="3" y1="3" x2="9" y2="9" />
                    <line x1="9" y1="3" x2="3" y2="9" />
                  </>
                )}
              </svg>
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────────

export default function SignUpForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const passwordValid = RULES.every((r) => r.test(password))

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!passwordValid) {
      setError('Please meet all password requirements before continuing.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName: displayName || undefined }),
      })

      const data = await response.json() as { user?: unknown; error?: string }

      if (!response.ok) {
        setError(data.error ?? 'Sign up failed. Please try again.')
        return
      }

      setConfirmed(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (confirmed) {
    return (
      <div className="text-center space-y-3">
        <p className="text-lg font-semibold text-gray-900">Check your email</p>
        <p className="text-sm text-gray-600">
          We sent a confirmation link to <span className="font-medium">{email}</span>.
          Click it to activate your account, then{' '}
          <button
            onClick={() => router.push('/sign-in')}
            className="text-brand underline hover:no-underline"
          >
            sign in
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Display name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="Your name"
        />
      </div>

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
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="••••••••"
        />
        <PasswordStrength password={password} />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || (password.length > 0 && !passwordValid)}
        className="w-full py-2 px-4 bg-brand text-white font-semibold rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isLoading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
