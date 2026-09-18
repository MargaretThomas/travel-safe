import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Circle, Polyline } from 'react-native-maps';

import { MapMarker } from '@/components/map/map-marker';
import { UserLocationMarker } from '@/components/map/user-location-marker';
import { Spacing } from '@/constants/theme';
import { strings } from '@/i18n/strings';
import type { LivePosition } from '@/lib/location';
import { metersBetween } from '@/lib/location';
import { createMapController, type NativeMapHandle } from '@/lib/map/map-service';
import type { MapCircle, MapMarker as MapMarkerModel, MapPolyline, MapRegion } from '@/lib/map/map.types';
import { defaultRegionForCoordinate, regionForCamera, regionForCoordinates } from '@/lib/map/regions';

export type SafetyMapProps = {
  style?: StyleProp<ViewStyle>;
  liveLocation?: LivePosition | null;
  accuracyMeters?: number | null;
  region?: MapRegion | null;
  markers?: readonly MapMarkerModel[];
  circles?: readonly MapCircle[];
  polylines?: readonly MapPolyline[];
  followUser?: boolean;
  controls?: boolean;
  onReady?: () => void;
};

const USER_MARKER_ID = 'map-user-location';
const DEFAULT_FOLLOW_ZOOM = 14;
const FOLLOW_THRESHOLD_METERS = 30;
const ZOOM_STEP = 1;
const DEFAULT_REGION_LATITUDE = -33.9249;
const DEFAULT_REGION_LONGITUDE = 18.4241;

export function SafetyMap({
  style,
  liveLocation,
  accuracyMeters,
  region,
  markers = [],
  circles = [],
  polylines = [],
  followUser = true,
  controls = true,
  onReady,
}: SafetyMapProps) {
  const controllerRef = useRef(createMapController(null));
  const lastCenteredRef = useRef<LivePosition | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const initialRegion = useMemo(() => {
    if (region) return region;
    const fromCircles = regionForCoordinates(circles.map((circle) => circle.center));
    if (fromCircles) return fromCircles;
    if (liveLocation) return defaultRegionForCoordinate(liveLocation, { latitudeDelta: 0.05, longitudeDelta: 0.07 });
    return defaultRegionForCoordinate(
      { latitude: DEFAULT_REGION_LATITUDE, longitude: DEFAULT_REGION_LONGITUDE },
      { latitudeDelta: 0.1, longitudeDelta: 0.15 },
    );
  }, [circles, liveLocation, region]);

  const attachMapRef = useCallback((node: MapView | null) => {
    controllerRef.current = createMapController(node as unknown as NativeMapHandle | null);
  }, []);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    onReady?.();
  }, [onReady]);

  const lastKnownCoordinate = useMemo(
    () => (liveLocation ? { latitude: liveLocation.latitude, longitude: liveLocation.longitude } : null),
    [liveLocation],
  );

  const recenterToUser = useCallback(() => {
    const coordinate = lastKnownCoordinate;
    if (!coordinate) {
      controllerRef.current.animateToRegion(initialRegion);
      return;
    }
    controllerRef.current.recenter(coordinate, regionForCamera({ center: coordinate, zoom: DEFAULT_FOLLOW_ZOOM }));
  }, [initialRegion, lastKnownCoordinate]);

  useEffect(() => {
    if (!liveLocation || !followUser || !isMapReady) return;

    const last = lastCenteredRef.current;
    if (last && metersBetween(last, liveLocation) < FOLLOW_THRESHOLD_METERS) {
      return;
    }

    lastCenteredRef.current = liveLocation;
    controllerRef.current.recenter(liveLocation, regionForCamera({ center: liveLocation, zoom: DEFAULT_FOLLOW_ZOOM }));
  }, [followUser, isMapReady, liveLocation]);

  useEffect(() => {
    if (!region || !isMapReady) return;
    controllerRef.current.animateToRegion(region);
  }, [isMapReady, region]);

  const handleZoomBy = useCallback(
    (deltaZoom: number) => {
      const anchor =
        lastKnownCoordinate ?? { latitude: initialRegion.latitude, longitude: initialRegion.longitude };
      void controllerRef.current.zoomBy(anchor, deltaZoom);
    },
    [initialRegion, lastKnownCoordinate],
  );

  const handleZoomIn = useCallback(() => handleZoomBy(ZOOM_STEP), [handleZoomBy]);
  const handleZoomOut = useCallback(() => handleZoomBy(-ZOOM_STEP), [handleZoomBy]);

  if (Platform.OS === 'web') {
    return (
      <View testID="safety-map" style={[styles.container, style]}>
        <View style={styles.fallback} pointerEvents="none">
          <View style={styles.fallbackCopy}>
            <Text style={styles.fallbackTitle}>{strings.fallback.title}</Text>
            <Text style={styles.fallbackBody}>{strings.fallback.body}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View testID="safety-map" style={[styles.container, style]}>
      <MapView
        ref={attachMapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
        showsCompass
        showsScale
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
        loadingEnabled
        onMapReady={handleMapReady}
        accessibilityLabel={strings.safetyMap.headerTitle}
        testID="map-view">
        {circles.map((circle) => (
          <Circle
            key={circle.id}
            testID={`map-circle-${circle.id}`}
            center={circle.center}
            radius={circle.radiusMeters}
            fillColor={circle.fillColor}
            strokeColor={circle.strokeColor}
            strokeWidth={circle.strokeWidth ?? 1}
          />
        ))}

        {polylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            testID={`map-polyline-${polyline.id}`}
            coordinates={polyline.coordinates}
            strokeColor={polyline.color}
            strokeWidth={polyline.width ?? 3}
          />
        ))}

        {markers.map((marker) => (
          <MapMarker key={marker.id} marker={marker} />
        ))}

        {liveLocation ? (
          <UserLocationMarker
            coordinate={{ latitude: liveLocation.latitude, longitude: liveLocation.longitude }}
            accuracyMeters={accuracyMeters}
            title={strings.safetyMap.liveLocationTitle}
            testID={USER_MARKER_ID}
          />
        ) : null}
      </MapView>

      {controls ? (
        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.controlCluster}>
            <MapControlButton
              testID="map-zoom-in"
              label={strings.safetyMap.zoomIn}
              symbol="+"
              onPress={handleZoomIn}
            />
            <MapControlButton
              testID="map-zoom-out"
              label={strings.safetyMap.zoomOut}
              symbol="−"
              onPress={handleZoomOut}
            />
          </View>
          <MapControlButton
            testID="map-recenter"
            label={strings.safetyMap.recenter}
            symbol="◎"
            onPress={recenterToUser}
            primary
          />
        </View>
      ) : null}
    </View>
  );
}

type MapControlButtonProps = {
  testID: string;
  label: string;
  symbol: string;
  onPress: () => void;
  primary?: boolean;
};

function MapControlButton({ testID, label, symbol, onPress, primary }: MapControlButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.controlButton,
        primary && styles.controlButtonPrimary,
        pressed && styles.controlButtonPressed,
      ]}>
      <View style={styles.symbol}>
        <Text style={[styles.symbolText, { color: primary ? '#ffffff' : '#000000' }]}>{symbol}</Text>
      </View>
    </Pressable>
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
  controls: {
    position: 'absolute',
    right: Spacing.three,
    top: Spacing.six,
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  controlCluster: {
    gap: Spacing.one,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  controlButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  controlButtonPressed: {
    opacity: 0.7,
  },
  symbol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  fallbackCopy: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fallbackBody: {
    fontSize: 14,
    textAlign: 'center',
  },
});