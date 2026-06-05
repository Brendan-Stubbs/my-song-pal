import { redirect } from 'next/navigation'
import { createAuthService } from '@/services/auth/auth.service'
import { getUserPlan } from '@/lib/subscription'
import ScalePatternEditor from '@/components/tools/ScalePatternEditor'

export default async function CreateScalePatternPage() {
  const authService = await createAuthService()
  const user = await authService.getUser()
  const plan = user ? await getUserPlan(user.id) : 'free'

  if (plan !== 'premium') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-warm-page dark:bg-gray-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScalePatternEditor />
      </main>
    </div>
  )
}
