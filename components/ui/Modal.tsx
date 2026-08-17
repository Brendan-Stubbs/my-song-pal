'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  /** Applied to the dialog surface (e.g. sizing). */
  className?: string
  'aria-label'?: string
}

/** Centered, portalled dialog with a scrim. Closes on backdrop click + Escape. */
export function Modal({ onClose, children, className, 'aria-label': ariaLabel }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
