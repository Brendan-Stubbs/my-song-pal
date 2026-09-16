import { redirect } from 'next/navigation'
import { createAuthService } from '@/services/auth/auth.service'
import { isSuperUser } from '@/lib/super-user.server'
import ScalePatternEditor from '@/components/tools/ScalePatternEditor'

export default async function CreateScalePatternPage() {
  const authService = await createAuthService()
  const user = await authService.getUser()

  // Authoring scale patterns writes data the whole app reads, so it is gated on
  // super-user status rather than on a paid plan.
  if (!user) redirect('/sign-in')
  if (!(await isSuperUser(user.id))) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-warm-page dark:bg-gray-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScalePatternEditor />
      </main>
    </div>
  )
}
