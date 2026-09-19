import { useCallback, useEffect, useState } from 'react';

import { createTrip, type TripPlan, type TripPoint } from '@/lib/api/trips';
import { buildClientTripPlan } from '@/lib/api/trip-fallback';
import { strings } from '@/i18n/strings';
import type { PlaceSuggestion } from '@/lib/map/geocoding';
import type { MapCoordinate } from '@/lib/map/map.types';

export type TripPlanStatus = 'idle' | 'loading' | 'ready' | 'error';

export function suggestionToTripPoint(suggestion: PlaceSuggestion): TripPoint {
  return {
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    label: suggestion.label,
  };
}

export function currentLocationToTripPoint(
  coordinate: MapCoordinate,
  label = strings.trip.currentLocationLabel,
): TripPoint {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    label,
  };
}

export function tripStatusMessage(status: TripPlanStatus): string | null {
  if (status === 'loading') return strings.trip.planning;
  if (status === 'error') return strings.trip.planFailed;
  return null;
}

export function useTripPlan(planTrip: typeof createTrip = createTrip) {
  const [origin, setOrigin] = useState<TripPoint | null>(null);
  const [destination, setDestination] = useState<TripPoint | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [status, setStatus] = useState<TripPlanStatus>('idle');

  const selectOrigin = useCallback((point: TripPoint) => {
    setOrigin(point);
  }, []);

  const selectDestination = useCallback((point: TripPoint) => {
    setDestination(point);
  }, []);

  useEffect(() => {
    if (!origin || !destination) {
      setPlan(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    void planTrip({ origin, destination })
      .then((next) => {
        if (cancelled) return;
        setPlan(next);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setPlan(buildClientTripPlan(origin, destination));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [destination, origin, planTrip]);

  return {
    origin,
    destination,
    plan,
    status,
    statusMessage: tripStatusMessage(status),
    selectOrigin,
    selectDestination,
  };
}
