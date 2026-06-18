import { redirect } from 'next/navigation'
import { createAuthService } from '@/services/auth/auth.service'
import { getUserAccess } from '@/lib/subscription'
import ScalePatternEditor from '@/components/tools/ScalePatternEditor'

export default async function CreateScalePatternPage() {
  const authService = await createAuthService()
  const user = await authService.getUser()
  const access = user
    ? await getUserAccess(user.id)
    : { hasPremiumAccess: false }

  if (!access.hasPremiumAccess) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-warm-page dark:bg-gray-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScalePatternEditor />
      </main>
    </div>
  )
}
