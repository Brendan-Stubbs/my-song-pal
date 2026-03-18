import Link from 'next/link'
import SignUpForm from '@/components/auth/SignUpForm'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            MySongPal
          </h1>
          <h2 className="mt-2 text-center text-xl text-gray-600">
            Create your account
          </h2>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg space-y-6">
          <SignUpForm />

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/sign-in"
              className="font-medium text-brand hover:opacity-80"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
