import { useEffect, useState } from 'react';

import type { LivePosition } from '@/lib/location';
import {
  bboxForPosition,
  fetchSafetyHeatmap,
  heatmapCellsToSafetyZones,
} from '@/lib/safety-api';
import {
  MOCK_SAFETY_ZONES,
  type SafetyZone,
} from '@/lib/safety-map';

export type SafetyHeatmapState = {
  zones: SafetyZone[];
  source: 'api' | 'fallback' | 'empty';
  error: string | null;
  isLoading: boolean;
};

export function useSafetyHeatmap(
  liveLocation?: LivePosition | null,
): SafetyHeatmapState {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';
  const roundedPosition = liveLocation
    ? {
        latitude: Number(liveLocation.latitude.toFixed(2)),
        longitude: Number(liveLocation.longitude.toFixed(2)),
      }
    : null;
  const bboxKey = bboxForPosition(roundedPosition).join(',');

  const [state, setState] = useState<SafetyHeatmapState>(() => ({
    zones: MOCK_SAFETY_ZONES,
    source: 'fallback',
    error: apiBaseUrl
      ? null
      : 'EXPO_PUBLIC_API_BASE_URL is not configured',
    isLoading: Boolean(apiBaseUrl),
  }));

  useEffect(() => {
    if (!apiBaseUrl) return;

    let cancelled = false;
    const requestBbox = bboxKey
      .split(',')
      .map(Number) as [number, number, number, number];

    fetchSafetyHeatmap(apiBaseUrl, requestBbox)
      .then((response) => {
        if (cancelled) return;
        const zones = heatmapCellsToSafetyZones(response.cells);
        setState({
          zones,
          source: zones.length ? 'api' : 'empty',
          error: null,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          zones: MOCK_SAFETY_ZONES,
          source: 'fallback',
          error:
            error instanceof Error
              ? error.message
              : 'Safety heatmap request failed',
          isLoading: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, bboxKey]);

  return state;
}
