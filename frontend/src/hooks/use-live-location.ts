import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { strings } from '@/i18n/strings';
import type { LivePosition } from '@/lib/location';

export type LiveLocationState = {
  position: LivePosition | null;
  error: string | null;
  isLocating: boolean;
  retry: () => void;
};

export function useLiveLocation(): LiveLocationState {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLocating(true);
      setError(null);
      setPosition(null);
      watcherRef.current?.remove();
      watcherRef.current = null;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status !== 'granted') {
          setError(strings.safetyMap.locationUnavailable);
          setIsLocating(false);
          return;
        }

        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        if (cancelled) return;
        setPosition({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
        });

        watcherRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 2000 },
          (location) => {
            if (cancelled) return;
            setPosition({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          },
        );
      } catch {
        if (!cancelled) {
          setError(strings.safetyMap.locationUnavailable);
        }
      } finally {
        if (!cancelled) {
          setIsLocating(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [retryNonce]);

  return {
    position,
    error,
    isLocating,
    retry: () => setRetryNonce((nonce) => nonce + 1),
  };
}