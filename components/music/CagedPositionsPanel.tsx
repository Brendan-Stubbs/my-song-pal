'use client';

import { useEffect, useState } from 'react';
import type { CagedPosition } from '@/types/music';
import CagedPositionDiagram from './CagedPositionDiagram';

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
  const [positions, setPositions] = useState<CagedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPositions() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          key: selectedKey,
          scale: selectedScale,
          tuning: tuning.join(','),
        });
        const response = await fetch(
          `/api/music/positions?${params.toString()}`,
        );
        const data = (await response.json()) as {
          positions?: CagedPosition[];
          error?: string;
        };

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? 'Failed to load positions');
          setPositions([]);
        } else {
          setPositions(data.positions ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load positions. Please try again.');
          setPositions([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchPositions();
    return () => {
      cancelled = true;
    };
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

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading positions…</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!isLoading && !error && positions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No positions found.
          </p>
        </div>
      )}

      {!isLoading && !error && positions.length > 0 && (
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
