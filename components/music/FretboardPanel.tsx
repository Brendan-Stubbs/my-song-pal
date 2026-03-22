'use client';

import { useMemo, useState } from 'react';
import type { FretboardNote } from '@/types/music';
import FretboardDiagram from './FretboardDiagram';
import { getFretboardNotes } from '@/lib/fretboard';

const FRET_COUNT = 12;

export interface FretboardPanelProps {
  selectedKey: string;
  selectedScale: string;
  tuning: string[];
}

export default function FretboardPanel({
  selectedKey,
  selectedScale,
  tuning,
}: FretboardPanelProps) {
  const [showDegrees, setShowDegrees] = useState(false);

  const { notes, error } = useMemo(() => {
    try {
      return {
        notes: getFretboardNotes(selectedKey, selectedScale, tuning, FRET_COUNT),
        error: null,
      };
    } catch (err) {
      return {
        notes: [] as FretboardNote[],
        error: err instanceof Error ? err.message : 'Failed to load fretboard',
      };
    }
  }, [selectedKey, selectedScale, tuning]);

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Scale Fretboard
        </h2>
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

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!error && (
        <FretboardDiagram
          notes={notes}
          fretCount={FRET_COUNT}
          showDegrees={showDegrees}
        />
      )}
    </div>
  );
}
