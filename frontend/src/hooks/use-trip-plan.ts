import { useCallback, useRef, useState } from 'react';

import { strings } from '@/i18n/strings';
import { buildClientTripPlan } from '@/lib/api/trip-fallback';
import { createTrip, type TripPlan, type TripPoint } from '@/lib/api/trips';
import type { PlaceSuggestion } from '@/lib/map/geocoding';
import type { MapCoordinate } from '@/lib/map/map.types';
import { applyRoadPathway } from '@/lib/map/road-directions';

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
  label: string = strings.trip.currentLocationLabel,
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

export function useTripPlan(
  planTrip: typeof createTrip = createTrip,
  snapToRoads: typeof applyRoadPathway = applyRoadPathway,
) {
  const [origin, setOrigin] = useState<TripPoint | null>(null);
  const [destination, setDestination] = useState<TripPoint | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [status, setStatus] = useState<TripPlanStatus>('idle');
  const originRef = useRef<TripPoint | null>(null);
  const destinationRef = useRef<TripPoint | null>(null);
  const requestIdRef = useRef(0);
  const requestPlan = useCallback(
    (nextOrigin: TripPoint, nextDestination: TripPoint) => {
      const requestId = ++requestIdRef.current;
      setPlan(null);
      setStatus('loading');

      void planTrip({
        origin: nextOrigin,
        destination: nextDestination,
        profile: 'driving',
      })
        .then((next) => snapToRoads(next))
        .then((next) => {
          if (requestIdRef.current !== requestId) return;
          setPlan(next);
          setStatus('ready');
        })
        .catch(async () => {
          if (requestIdRef.current !== requestId) return;
          const fallback = await snapToRoads(
            buildClientTripPlan(nextOrigin, nextDestination),
          );
          if (requestIdRef.current !== requestId) return;
          setPlan(fallback);
          setStatus('error');
        });
    },
    [planTrip, snapToRoads],
  );

  const selectOrigin = useCallback(
    (point: TripPoint) => {
      originRef.current = point;
      setOrigin(point);
      if (destinationRef.current) {
        requestPlan(point, destinationRef.current);
      }
    },
    [requestPlan],
  );

  const selectDestination = useCallback(
    (point: TripPoint) => {
      destinationRef.current = point;
      setDestination(point);
      if (originRef.current) {
        requestPlan(originRef.current, point);
      }
    },
    [requestPlan],
  );

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
