import { redirect } from 'next/navigation'
import { createAuthService } from '@/services/auth/auth.service'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authService = await createAuthService()
  const session = await authService.getSession()

  if (!session) {
    redirect('/sign-in')
  }

  return <ErrorBoundary>{children}</ErrorBoundary>
}
