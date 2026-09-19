import { useEffect, useState } from 'react';

import type { HeatmapCell } from '@/lib/api/trips';
import {
  bboxForCoordinate,
  fetchSafetyHeatmap,
} from '@/lib/api/safety';
import type { MapCoordinate } from '@/lib/map/map.types';

export type SafetyHeatmapSource = 'api' | 'fallback';

export type SafetyHeatmapState = {
  cells: HeatmapCell[];
  source: SafetyHeatmapSource;
  error: string | null;
};

export function useSafetyHeatmap(
  coordinate: MapCoordinate | null,
  fallbackCells: HeatmapCell[],
): SafetyHeatmapState {
  const [state, setState] = useState<SafetyHeatmapState>(() => ({
    cells: fallbackCells,
    source: 'fallback',
    error: null,
  }));

  const bboxKey = bboxForCoordinate(coordinate).join(',');

  useEffect(() => {
    let cancelled = false;
    const bbox = bboxKey.split(',').map(Number) as [
      number,
      number,
      number,
      number,
    ];

    void fetchSafetyHeatmap(bbox)
      .then((response) => {
        if (cancelled) return;
        setState({
          cells: response.cells.length ? response.cells : fallbackCells,
          source: response.cells.length ? 'api' : 'fallback',
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          cells: fallbackCells,
          source: 'fallback',
          error:
            error instanceof Error
              ? error.message
              : 'Safety heatmap request failed',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [bboxKey, fallbackCells]);

  return state;
}
