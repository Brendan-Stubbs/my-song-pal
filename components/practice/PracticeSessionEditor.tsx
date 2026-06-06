'use client'

import { useState, useEffect, useMemo } from 'react'
import type { PracticeSession, PracticeBlock, PracticeExercise } from '@/lib/practice-storage'
import { createBlock, createExercise, exerciseTotalMinutes, exerciseDisplayName, totalMinutes, formatDuration } from '@/lib/practice-storage'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Sortable block row ────────────────────────────────────────────────────────

interface BlockRowProps {
  block: PracticeBlock
  onChange: (partial: Partial<PracticeBlock>) => void
  onDelete: () => void
  onStartHere: () => void
}

function SortableBlockRow({ block, onChange, onDelete, onStartHere }: BlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  const [notesOpen, setNotesOpen] = useState(!!block.notes)
  const [exercisesOpen, setExercisesOpen] = useState(!!block.exercises?.length)

  const hasExercises = (block.exercises?.length ?? 0) > 0

  function adjustDuration(delta: number) {
    onChange({ durationMinutes: Math.max(1, Math.min(120, block.durationMinutes + delta)) })
  }

  function updateExercises(exercises: PracticeExercise[]) {
    onChange({
      exercises,
      durationMinutes: exerciseTotalMinutes(exercises),
    })
  }

  function addExercise() {
    const exercises = [...(block.exercises ?? []), createExercise()]
    updateExercises(exercises)
    setExercisesOpen(true)
  }

  function updateExercise(id: string, partial: Partial<PracticeExercise>) {
    const exercises = (block.exercises ?? []).map((e) =>
      e.id === id ? { ...e, ...partial } : e,
    )
    updateExercises(exercises)
  }

  function deleteExercise(id: string) {
    const exercises = (block.exercises ?? []).filter((e) => e.id !== id)
    if (exercises.length === 0) {
      onChange({ exercises: undefined })
    } else {
      updateExercises(exercises)
    }
  }

  function adjustExerciseDuration(id: string, delta: number) {
    const exercise = block.exercises?.find((e) => e.id === id)
    if (!exercise) return
    updateExercise(id, { durationMinutes: Math.max(1, Math.min(120, exercise.durationMinutes + delta)) })
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-4 flex gap-3 group/row">
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 touch-none mt-1"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" /><circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" /><circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>

      {/* Block content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Name + duration */}
        <div className="flex items-center gap-3">
          <input
            value={block.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Block name…"
            className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-brand dark:focus:border-brand outline-none transition-colors py-0.5"
          />

          {/* Duration — read-only sum when exercises exist */}
          {hasExercises ? (
            <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {block.exercises!.length} exercise{block.exercises!.length !== 1 ? 's' : ''} · {formatDuration(block.durationMinutes)} total
            </span>
          ) : (
            <div className="flex items-center gap-0.5 shrink-0 bg-gray-100 dark:bg-gray-700/60 rounded-lg px-1 py-0.5">
              <button
                onClick={() => adjustDuration(-5)}
                aria-label="Decrease by 5 minutes"
                className="w-6 h-6 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand transition-colors text-base leading-none font-medium"
              >
                −
              </button>
              <div className="flex items-baseline gap-0.5 px-1">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={block.durationMinutes}
                  onChange={(e) =>
                    onChange({ durationMinutes: Math.max(1, Math.min(120, Number(e.target.value) || 1)) })
                  }
                  className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white bg-transparent outline-none tabular-nums"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">min</span>
              </div>
              <button
                onClick={() => adjustDuration(5)}
                aria-label="Increase by 5 minutes"
                className="w-6 h-6 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand transition-colors text-base leading-none font-medium"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Exercises */}
        <div>
          <button
            onClick={() => setExercisesOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-brand dark:hover:text-brand transition-colors"
          >
            <svg
              width="10" height="10" viewBox="0 0 10 10"
              fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
              style={{ transform: exercisesOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
            >
              <polyline points="3,2 7,5 3,8" />
            </svg>
            {exercisesOpen
              ? 'Hide exercises'
              : hasExercises
              ? `${block.exercises!.length} exercise${block.exercises!.length !== 1 ? 's' : ''}`
              : 'Add exercises'}
          </button>
          {exercisesOpen && (
            <div className="mt-2 space-y-3 pl-3 border-l-2 border-gray-100 dark:border-gray-700">
              {(block.exercises ?? []).map((exercise, index) => (
                <div key={exercise.id} className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Exercise {index + 1}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={exercise.name}
                      onChange={(e) => updateExercise(exercise.id, { name: e.target.value })}
                      placeholder="e.g. Alternate picking"
                      className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1.5 outline-none focus:border-brand dark:focus:border-brand transition-colors"
                    />
                    <div className="flex items-center gap-0.5 shrink-0 bg-gray-100 dark:bg-gray-700/60 rounded-lg px-1 py-0.5">
                      <button
                        onClick={() => adjustExerciseDuration(exercise.id, -1)}
                        aria-label="Decrease by 1 minute"
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand transition-colors text-sm leading-none"
                      >
                        −
                      </button>
                      <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums w-5 text-center">
                        {exercise.durationMinutes}
                      </span>
                      <button
                        onClick={() => adjustExerciseDuration(exercise.id, 1)}
                        aria-label="Increase by 1 minute"
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand transition-colors text-sm leading-none"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-400 dark:text-gray-500 pr-0.5">m</span>
                    </div>
                    <button
                      onClick={() => deleteExercise(exercise.id)}
                      title="Delete exercise"
                      aria-label="Delete exercise"
                      className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors shrink-0"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                        <line x1="1" y1="1" x2="9" y2="9" />
                        <line x1="9" y1="1" x2="1" y2="9" />
                      </svg>
                    </button>
                  </div>
                  {!exercise.name.trim() && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      Untitled — will show as &ldquo;{exerciseDisplayName(exercise, index)}&rdquo; during practice
                    </p>
                  )}
                </div>
              ))}
              <button
                onClick={addExercise}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-brand dark:hover:text-brand transition-colors"
              >
                + Add exercise
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <button
            onClick={() => setNotesOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-brand dark:hover:text-brand transition-colors"
          >
            <svg
              width="10" height="10" viewBox="0 0 10 10"
              fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
              style={{ transform: notesOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
            >
              <polyline points="3,2 7,5 3,8" />
            </svg>
            {notesOpen ? 'Hide notes' : block.notes ? 'Show notes' : 'Add notes'}
          </button>
          {notesOpen && (
            <textarea
              value={block.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Practice notes, exercises, goals…"
              rows={3}
              className="mt-2 w-full text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 outline-none focus:border-brand dark:focus:border-brand resize-none transition-colors"
            />
          )}
        </div>
      </div>

      {/* Row actions */}
      <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
        <button
          onClick={onStartHere}
          title="Start session from this block"
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 hover:bg-brand hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <polygon points="1,1 9,5 1,9" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          title="Delete block"
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="1" y1="1" x2="10" y2="10" />
            <line x1="10" y1="1" x2="1" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────

interface PracticeSessionEditorProps {
  session: PracticeSession
  onSave: (session: PracticeSession) => Promise<void>
  onBack: () => void
  onStart: (session: PracticeSession, startBlockIndex: number) => void
}

export default function PracticeSessionEditor({
  session,
  onSave,
  onBack,
  onStart,
}: PracticeSessionEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor))
  const [draft, setDraft] = useState(session)
  const [savedSnapshot, setSavedSnapshot] = useState(session)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(session)
    setSavedSnapshot(session)
  }, [session])

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSnapshot),
    [draft, savedSnapshot],
  )

  function update(partial: Partial<PracticeSession>) {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const toSave = { ...draft, updatedAt: Date.now() }
      await onSave(toSave)
      setDraft(toSave)
      setSavedSnapshot(toSave)
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return
    onBack()
  }

  function updateBlock(id: string, partial: Partial<PracticeBlock>) {
    update({ blocks: draft.blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)) })
  }

  function addBlock() {
    update({ blocks: [...draft.blocks, createBlock()] })
  }

  function deleteBlock(id: string) {
    update({ blocks: draft.blocks.filter((b) => b.id !== id) })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = draft.blocks.findIndex((b) => b.id === active.id)
      const newIndex = draft.blocks.findIndex((b) => b.id === over.id)
      update({ blocks: arrayMove(draft.blocks, oldIndex, newIndex) })
    }
  }

  const total = totalMinutes(draft)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="10,4 6,8 10,12" />
            </svg>
            Sessions
          </button>
          <span className="text-gray-300 dark:text-gray-600 shrink-0">/</span>
          <input
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Session name"
            className="text-xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-brand dark:focus:border-brand outline-none transition-colors min-w-0 w-56"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium hidden sm:block">
              Unsaved changes
            </span>
          )}
          <span className="text-sm text-gray-400 dark:text-gray-500 hidden sm:block">
            {draft.blocks.length} block{draft.blocks.length !== 1 ? 's' : ''} · {formatDuration(total)}
          </span>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="px-4 py-2 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => onStart(draft, 0)}
            disabled={draft.blocks.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white font-medium text-sm hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
              <polygon points="1,1 10,5.5 1,10" />
            </svg>
            Start
          </button>
        </div>
      </div>

      {/* Block list */}
      {draft.blocks.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">No blocks yet. Add one below to get started.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draft.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {draft.blocks.map((block, index) => (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  onChange={(partial) => updateBlock(block.id, partial)}
                  onDelete={() => deleteBlock(block.id)}
                  onStartHere={() => onStart(draft, index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add block */}
      <button
        onClick={addBlock}
        className="w-full py-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-400 dark:text-gray-500 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors"
      >
        + Add block
      </button>
    </div>
  )
}
