'use client';

import { useMemo, useState } from 'react';
import type { CagedPosition, ScalePatternVariant } from '@/types/music';
import CagedPositionDiagram from './CagedPositionDiagram';
import { getCagedPositions } from '@/lib/fretboard';
import { hasThreeNotesPerString } from '@/data/scale-patterns';

export interface CagedPositionsPanelProps {
  selectedKey: string;
  selectedScale: string;
  tuning: string[];
  isStandardTuning?: boolean;
}

export default function CagedPositionsPanel({
  selectedKey,
  selectedScale,
  tuning,
  isStandardTuning = true,
}: CagedPositionsPanelProps) {
  const [showDegrees, setShowDegrees] = useState(false);
  const [variant, setVariant] = useState<ScalePatternVariant>('default');

  // Only offer the 3nps toggle when the selected scale actually has one;
  // otherwise fall back to the default fingering regardless of toggle state.
  const has3nps = hasThreeNotesPerString(selectedScale);
  const effectiveVariant: ScalePatternVariant = has3nps ? variant : 'default';

  const { positions, error } = useMemo(() => {
    try {
      return {
        positions: getCagedPositions(selectedKey, selectedScale, tuning, effectiveVariant),
        error: null,
      };
    } catch (err) {
      return {
        positions: [] as CagedPosition[],
        error: err instanceof Error ? err.message : 'Failed to load positions',
      };
    }
  }, [selectedKey, selectedScale, tuning, effectiveVariant]);

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Scale Positions
        </h2>
        {isStandardTuning && (
          <div className="flex items-center gap-4">
            {has3nps && (
              <div
                role="radiogroup"
                aria-label="Fingering style"
                className="inline-flex rounded-md border border-gray-200 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-700/50"
              >
                {([
                  { value: 'default', label: 'Default' },
                  { value: '3nps', label: '3 notes per string' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={variant === opt.value}
                    onClick={() => setVariant(opt.value)}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      variant === opt.value
                        ? 'bg-brand text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-brand dark:hover:text-brand'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showDegrees}
                onChange={(e) => setShowDegrees(e.target.checked)}
                className="rounded border-gray-300 text-brand focus:ring-brand"
              />
              Show scale degrees
            </label>
          </div>
        )}
      </div>

      {!isStandardTuning && (
        <div className="flex items-center gap-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-500 dark:text-amber-400">
            <path d="M9 1L1 16h16L9 1z" />
            <line x1="9" y1="7" x2="9" y2="11" />
            <circle cx="9" cy="13.5" r="0.5" fill="currentColor" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Scale positions are only available in standard tunings.
          </p>
        </div>
      )}

      {isStandardTuning && error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {isStandardTuning && !error && positions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No positions found.
          </p>
        </div>
      )}

      {isStandardTuning && !error && positions.length > 0 && (
        <div className="flex flex-wrap gap-6 justify-start">
          {positions.map((position) => (
            <CagedPositionDiagram
              key={`${position.position}-${position.rootFret}`}
              position={position}
              showDegrees={showDegrees}
            />
          ))}
        </div>
      )}
    </div>
  );
}
