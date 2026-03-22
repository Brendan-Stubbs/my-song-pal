'use client';

import { useMemo, useState } from 'react';
import type { CagedPosition } from '@/types/music';
import CagedPositionDiagram from './CagedPositionDiagram';
import { getCagedPositions } from '@/lib/fretboard';

export interface CagedPositionsPanelProps {
  selectedKey: string;
  selectedScale: string;
  tuning: string[];
}

export default function CagedPositionsPanel({
  selectedKey,
  selectedScale,
  tuning,
}: CagedPositionsPanelProps) {
  const [showDegrees, setShowDegrees] = useState(false);

  const { positions, error } = useMemo(() => {
    try {
      return {
        positions: getCagedPositions(selectedKey, selectedScale, tuning),
        error: null,
      };
    } catch (err) {
      return {
        positions: [] as CagedPosition[],
        error: err instanceof Error ? err.message : 'Failed to load positions',
      };
    }
  }, [selectedKey, selectedScale, tuning]);

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          CAGED Scale Positions
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

      {!error && positions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No positions found.
          </p>
        </div>
      )}

      {!error && positions.length > 0 && (
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
