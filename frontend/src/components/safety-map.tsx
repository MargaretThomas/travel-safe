import { AppleMaps, GoogleMaps } from 'expo-maps';
import type { CameraPosition } from 'expo-maps';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useSafetyHeatmap } from '@/hooks/use-safety-heatmap';
import { strings } from '@/i18n/strings';
import { metersBetween, type LivePosition } from '@/lib/location';
import {
  buildHeatCircles,
  buildStationRiskCircles,
  DEFAULT_MAP_ZOOM,
  MOCK_SAFETY_ZONES,
  regionCenter,
} from '@/lib/safety-map';

const initialCameraPosition = {
  coordinates: regionCenter(MOCK_SAFETY_ZONES),
  zoom: DEFAULT_MAP_ZOOM,
};

const LIVE_LOCATION_MARKER_ID = 'live-location';
const LIVE_LOCATION_PIN_COLOR = '#007AFF';
const LIVE_LOCATION_ZOOM = 14;
const FOLLOW_THRESHOLD_METERS = 30;

type MapHandle = {
  setCameraPosition?: (config?: CameraPosition) => void;
};

export type SafetyMapProps = {
  style?: StyleProp<ViewStyle>;
  liveLocation?: LivePosition | null;
};

export function SafetyMap({ style, liveLocation }: SafetyMapProps) {
  const mapRef = useRef<MapHandle | null>(null);
  const lastCenteredRef = useRef<LivePosition | null>(null);
  const { zones, source } = useSafetyHeatmap(liveLocation);
  const heatCircles = useMemo(() => {
    if (source === 'api') {
      return buildStationRiskCircles(zones);
    }
    if (source === 'empty') {
      return [];
    }
    return buildHeatCircles(zones);
  }, [source, zones]);

  const attachMapRef = useCallback((instance: unknown) => {
    mapRef.current = instance as MapHandle | null;
  }, []);

  useEffect(() => {
    if (!liveLocation) return;

    const last = lastCenteredRef.current;
    if (last && metersBetween(last, liveLocation) < FOLLOW_THRESHOLD_METERS) {
      return;
    }

    lastCenteredRef.current = liveLocation;
    mapRef.current?.setCameraPosition?.({
      coordinates: {
        latitude: liveLocation.latitude,
        longitude: liveLocation.longitude,
      },
      zoom: LIVE_LOCATION_ZOOM,
    });
  }, [liveLocation]);

  const iosMarkers: AppleMaps.Marker[] = liveLocation
    ? [
        {
          id: LIVE_LOCATION_MARKER_ID,
          coordinates: {
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude,
          },
          title: strings.safetyMap.liveLocationTitle,
          systemImage: 'location.fill',
          tintColor: LIVE_LOCATION_PIN_COLOR,
        },
      ]
    : [];

  const androidMarkers: GoogleMaps.Marker[] = liveLocation
    ? [
        {
          id: LIVE_LOCATION_MARKER_ID,
          coordinates: {
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude,
          },
          title: strings.safetyMap.liveLocationTitle,
        },
      ]
    : [];

  return (
    <View testID="safety-map" style={[styles.container, style]}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          ref={attachMapRef}
          style={styles.map}
          cameraPosition={initialCameraPosition}
          markers={iosMarkers}
          circles={heatCircles}
          uiSettings={{ compassEnabled: true, myLocationButtonEnabled: true, scaleBarEnabled: true }}
          properties={{ isMyLocationEnabled: true, mapType: AppleMaps.MapType.STANDARD }}
        />
      ) : (
        <GoogleMaps.View
          ref={attachMapRef}
          style={styles.map}
          cameraPosition={initialCameraPosition}
          markers={androidMarkers}
          circles={heatCircles}
          uiSettings={{
            compassEnabled: true,
            myLocationButtonEnabled: true,
            scaleBarEnabled: true,
            zoomGesturesEnabled: true,
            scrollGesturesEnabled: true,
            tiltGesturesEnabled: true,
            rotationGesturesEnabled: true,
          }}
          properties={{ isMyLocationEnabled: true, mapType: GoogleMaps.MapType.NORMAL }}
          colorScheme={GoogleMaps.MapColorScheme.FOLLOW_SYSTEM}
        />
      )}
      {
        /*
        <SafetyLegend />
        */
      }

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
