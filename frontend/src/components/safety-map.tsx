import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafetyLegend } from '@/components/safety-legend';
import {
  buildHeatCircles,
  DEFAULT_MAP_ZOOM,
  MOCK_SAFETY_ZONES,
  regionCenter,
} from '@/lib/safety-map';

const heatCircles = buildHeatCircles(MOCK_SAFETY_ZONES);
const cameraPosition = {
  // coordinates: regionCenter(MOCK_SAFETY_ZONES),
  zoom: DEFAULT_MAP_ZOOM,
};

export type SafetyMapProps = {
  style?: StyleProp<ViewStyle>;
};

export function SafetyMap({ style }: SafetyMapProps) {
  return (
    <View testID="safety-map" style={[styles.container, style]}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={styles.map}
          cameraPosition={cameraPosition}
          circles={heatCircles}
          uiSettings={{ compassEnabled: true, myLocationButtonEnabled: true, scaleBarEnabled: true }}
          properties={{ isMyLocationEnabled: true, mapType: AppleMaps.MapType.STANDARD }}
        />
      ) : (
        <GoogleMaps.View
          style={styles.map}
          cameraPosition={cameraPosition}
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
