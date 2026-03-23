'use client'

import { useState, useEffect } from 'react'
import type { PracticeSession } from '@/lib/practice-storage'
import {
  loadSessions,
  saveSessions,
  createSession,
  totalMinutes,
  formatDuration,
} from '@/lib/practice-storage'
import PracticeSessionEditor from './PracticeSessionEditor'
import PracticePlayer from './PracticePlayer'

// ── View state ────────────────────────────────────────────────────────────────

type View =
  | { type: 'list' }
  | { type: 'edit'; sessionId: string }
  | { type: 'play'; sessionId: string; startBlockIndex: number }

// ── Session card ──────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: PracticeSession
  onEdit: () => void
  onStart: () => void
  onDelete: () => void
}

function SessionCard({ session, onEdit, onStart, onDelete }: SessionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const total = totalMinutes(session)

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow flex flex-col gap-4 p-5">
      {/* Name + meta */}
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug">{session.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {session.blocks.length} block{session.blocks.length !== 1 ? 's' : ''} · {formatDuration(total)}
        </p>
      </div>

      {/* Block preview */}
      {session.blocks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {session.blocks.slice(0, 4).map((block) => (
            <div key={block.id} className="flex items-center gap-2 text-sm">
              <span className="text-brand font-mono text-xs w-8 shrink-0 tabular-nums">{block.durationMinutes}m</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{block.name}</span>
            </div>
          ))}
          {session.blocks.length > 4 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 pl-10">
              +{session.blocks.length - 4} more
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onStart}
          disabled={session.blocks.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
            <polygon points="1,1 10,5.5 1,10" />
          </svg>
          Start
        </button>

        <button
          onClick={onEdit}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors"
        >
          Edit
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="px-3 py-2 rounded-md text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete session"
            className="p-2 rounded-md text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,3.5 12,3.5" />
              <path d="M5,3.5V2.5a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1V3.5" />
              <path d="M3.5,3.5l.7,8a1,1,0,0,0,1,.9h3.6a1,1,0,0,0,1-.9l.7-8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function PracticeView() {
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [view, setView] = useState<View>({ type: 'list' })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSessions(loadSessions())
    setLoaded(true)
  }, [])

  function updateSessions(next: PracticeSession[]) {
    setSessions(next)
    saveSessions(next)
  }

  function handleNewSession() {
    const session = createSession()
    updateSessions([...sessions, session])
    setView({ type: 'edit', sessionId: session.id })
  }

  function handleDeleteSession(id: string) {
    updateSessions(sessions.filter((s) => s.id !== id))
    if (view.type !== 'list' && 'sessionId' in view && view.sessionId === id) {
      setView({ type: 'list' })
    }
  }

  function handleUpdateSession(updated: PracticeSession) {
    updateSessions(sessions.map((s) => (s.id === updated.id ? updated : s)))
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
      </div>
    )
  }

  // ── Player ──────────────────────────────────────────────────────────────────

  if (view.type === 'play') {
    const session = sessions.find((s) => s.id === view.sessionId)
    if (!session) {
      setView({ type: 'list' })
      return null
    }
    return (
      <PracticePlayer
        session={session}
        startBlockIndex={view.startBlockIndex}
        onEnd={() => setView({ type: 'list' })}
      />
    )
  }

  // ── Editor ──────────────────────────────────────────────────────────────────

  if (view.type === 'edit') {
    const session = sessions.find((s) => s.id === view.sessionId)
    if (!session) {
      setView({ type: 'list' })
      return null
    }
    return (
      <PracticeSessionEditor
        session={session}
        onChange={handleUpdateSession}
        onBack={() => setView({ type: 'list' })}
        onStart={(blockIndex) =>
          setView({ type: 'play', sessionId: session.id, startBlockIndex: blockIndex })
        }
      />
    )
  }

  // ── Session list ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Practice Sessions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Build structured routines and track your practice time
          </p>
        </div>
        <button
          onClick={handleNewSession}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white font-medium text-sm hover:bg-brand/90 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          New session
        </button>
      </div>

      {/* Empty state */}
      {sessions.length === 0 ? (
        <div className="bg-warm-panel dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-16 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#ff9933" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="16" cy="16" r="13" />
              <line x1="16" y1="8" x2="16" y2="16" />
              <line x1="16" y1="16" x2="21" y2="21" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            No practice sessions yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 max-w-xs mx-auto">
            Create a session to organise your practice into timed blocks — warm up, technique, repertoire, and more.
          </p>
          <button
            onClick={handleNewSession}
            className="px-5 py-2.5 rounded-md bg-brand text-white font-medium text-sm hover:bg-brand/90 transition-colors"
          >
            Create your first session
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onEdit={() => setView({ type: 'edit', sessionId: session.id })}
              onStart={() => setView({ type: 'play', sessionId: session.id, startBlockIndex: 0 })}
              onDelete={() => handleDeleteSession(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
