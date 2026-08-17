import { createAuthService } from '@/services/auth/auth.service'
import SignOutButton from '@/components/auth/SignOutButton'
import DashboardContent from '@/components/DashboardContent'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { getUserAccess } from '@/lib/subscription'

export default async function DashboardPage() {
  const authService = await createAuthService()
  const user = await authService.getUser()
  const access = user
    ? await getUserAccess(user.id)
    : { level: 'free' as const, hasPremiumAccess: false, trialEndsAt: null, trialDaysLeft: null }

  return (
    <div className="min-h-screen bg-page">
      <header className="bg-surface border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand tracking-tight">MySongPal</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <DashboardContent
        userName={user?.displayName ?? user?.email ?? 'Musician'}
        isPremium={access.hasPremiumAccess}
        accessLevel={access.level}
        trialDaysLeft={access.trialDaysLeft}
      />
    </div>
  )
}
