'use client'

import { useState, type ReactNode } from 'react'
import HowToPlay from '@/components/exercises/HowToPlay'
import {
  FREE_DAILY_THEORY_QUESTIONS,
  theoryQuestionsUsedToday,
  bumpTheoryQuestions,
} from '@/lib/theory-quiz-limit'

export interface QuizOption {
  id: string
  label: string
}

export interface QuizQuestion {
  /** Main prompt text (plain). */
  prompt: string
  /** Optional emphasised token rendered large under the prompt (e.g. a chord). */
  accent?: string
  options: QuizOption[]
  answerId: string
  /** Extra line shown after answering (e.g. the spelled-out answer). */
  explain?: string
}

/** Render note/chord spellings with proper musical accidental glyphs. */
export function pretty(s: string): string {
  return s.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭')
}

/**
 * Shared multiple-choice quiz body: streak/score header, a prompt card, an
 * option grid with instant feedback, and a Next control. The parent owns any
 * settings (mode/difficulty) and should remount this via a `key` when they
 * change, so state resets cleanly.
 *
 * When `isPremium` is false, a shared daily free-question cap applies across
 * all theory quizzes (see `lib/theory-quiz-limit`). Trial and paid users pass
 * `isPremium: true` and are unlimited.
 */
const DEFAULT_HOW_TO: ReactNode[] = [
  'Read the question at the top.',
  'Tap the answer you think is right.',
  'See if you got it, then press Next for a new one.',
]

export default function MultipleChoiceQuiz({
  generate,
  isPremium = true,
  howTo = DEFAULT_HOW_TO,
}: {
  generate: () => QuizQuestion
  isPremium?: boolean
  /** Plain-language steps for the "How to play" card. */
  howTo?: ReactNode[]
}) {
  const [question, setQuestion] = useState<QuizQuestion>(generate)
  const [selected, setSelected] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [score, setScore] = useState({ right: 0, total: 0 })
  // Read once on mount — this component only mounts client-side (after the user
  // opens an exercise), so there is no SSR/hydration mismatch to worry about.
  const [used, setUsed] = useState(() => (isPremium ? 0 : theoryQuestionsUsedToday()))

  const gated = !isPremium
  const remaining = Math.max(0, FREE_DAILY_THEORY_QUESTIONS - used)
  const overLimit = gated && remaining <= 0

  const answered = selected != null

  function choose(id: string) {
    if (answered) return
    setSelected(id)
    const right = id === question.answerId
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }))
    if (right) {
      const n = streak + 1
      setStreak(n)
      if (n > best) setBest(n)
    } else {
      setStreak(0)
    }
    if (gated) setUsed(bumpTheoryQuestions())
  }

  function next() {
    setQuestion(generate())
    setSelected(null)
  }

  // Once the cap is hit and the current question is answered (or on a fresh
  // mount after the cap), swap the quiz body for an upgrade nudge.
  const showLimitInsteadOfQuestion = overLimit && !answered

  return (
    <div className="space-y-6">
      <HowToPlay steps={howTo} />

      {/* Score row */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        {streak > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 text-brand font-semibold">
            🔥 {streak} in a row
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
          {score.right}/{score.total} correct
        </span>
        {best > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">best streak {best}</span>
        )}
        {gated && (
          <span
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              remaining <= 3
                ? 'bg-brand/10 text-brand'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            title={`Free plan: ${FREE_DAILY_THEORY_QUESTIONS} theory questions per day`}
          >
            {overLimit ? 'Daily free limit reached' : `${remaining} free left today`}
          </span>
        )}
      </div>

      {showLimitInsteadOfQuestion ? (
        <UpgradeNudge />
      ) : (
        <>
          {/* Prompt */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface p-6 text-center">
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200">{question.prompt}</p>
            {question.accent && (
              <p className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-wide">
                {pretty(question.accent)}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt) => {
              const isAnswer = opt.id === question.answerId
              const isPicked = opt.id === selected
              let tone =
                'border-gray-200 dark:border-gray-700 bg-surface text-gray-800 dark:text-gray-100 hover:border-brand hover:text-brand'
              if (answered) {
                if (isAnswer)
                  tone =
                    'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                else if (isPicked)
                  tone =
                    'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                else tone = 'border-gray-200 dark:border-gray-700 bg-surface text-gray-400 dark:text-gray-500'
              }
              return (
                <button
                  key={opt.id}
                  onClick={() => choose(opt.id)}
                  disabled={answered}
                  className={`rounded-xl border-2 px-4 py-4 text-lg font-semibold transition-colors disabled:cursor-default ${tone}`}
                >
                  {pretty(opt.label)}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Feedback + next */}
      {answered && (
        <div className="space-y-4">
          <div
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              selected === question.answerId
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            }`}
          >
            <span className="text-xl leading-none" aria-hidden>
              {selected === question.answerId ? '✓' : '✗'}
            </span>
            <div className="text-sm">
              <p
                className={`font-semibold ${
                  selected === question.answerId
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {selected === question.answerId ? 'Correct!' : 'Not quite'}
              </p>
              {question.explain && (
                <p className="text-gray-600 dark:text-gray-300 mt-0.5">
                  {pretty(question.explain)}
                </p>
              )}
            </div>
          </div>
          {overLimit ? (
            <UpgradeNudge />
          ) : (
            <button
              onClick={next}
              className="px-6 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand/90 transition-colors shadow"
            >
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Soft paywall shown when a free user hits the daily theory-question cap. */
function UpgradeNudge() {
  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-full bg-brand/15 flex items-center justify-center text-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8l4.5 3L12 5l4.5 6L21 8l-1.5 10h-15L3 8z" />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          You’ve hit today’s free limit
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
          The free plan includes {FREE_DAILY_THEORY_QUESTIONS} theory questions a day. Come back
          tomorrow, or go Pro for unlimited theory practice.
        </p>
      </div>
      <button
        type="button"
        disabled
        title="Upgrades are coming soon"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm opacity-60 cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8l4.5 3L12 5l4.5 6L21 8l-1.5 10h-15L3 8z" />
        </svg>
        Upgrade to Pro — coming soon
      </button>
    </div>
  )
}
