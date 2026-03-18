import { createAuthService } from '@/services/auth/auth.service'
import SignOutButton from '@/components/auth/SignOutButton'

export default async function DashboardPage() {
  const authService = await createAuthService()
  const user = await authService.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand">MySongPal</h1>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome, {user?.displayName ?? user?.email}
          </h2>
          <p className="mt-2 text-gray-600">
            Your song management dashboard is ready.
          </p>
        </div>
      </main>
    </div>
  )
}
