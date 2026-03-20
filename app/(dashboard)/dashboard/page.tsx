import { createAuthService } from '@/services/auth/auth.service'
import SignOutButton from '@/components/auth/SignOutButton'
import CagedPositionsPanel from '@/components/music/CagedPositionsPanel'
import FretboardPanel from '@/components/music/FretboardPanel'

export default async function DashboardPage() {
  const authService = await createAuthService()
  const user = await authService.getUser()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand">MySongPal</h1>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Welcome, {user?.displayName ?? user?.email}
          </h2>
        </div>

        <FretboardPanel />

        <CagedPositionsPanel />
      </main>
    </div>
  )
}
