import { Circle } from 'react-native-maps';

import { MapMarker } from '@/components/map/map-marker';
import type { MapCoordinate } from '@/lib/map/map.types';
import { userLocationMarker } from '@/lib/map/markers';

export type UserLocationMarkerProps = {
  coordinate: MapCoordinate;
  accuracyMeters?: number | null;
  title?: string;
  testID?: string;
};

const USER_PIN_COLOR = '#007AFF';
const ACCURACY_HALO_COLOR = 'rgba(0, 122, 255, 0.12)';
const ACCURACY_RING_COLOR = 'rgba(0, 122, 255, 0.35)';

export function UserLocationMarker({
  coordinate,
  accuracyMeters,
  title,
  testID,
}: UserLocationMarkerProps) {
  const marker = userLocationMarker(coordinate, title ? { title } : undefined);

  if (!marker) return null;

  return (
    <>
      {accuracyMeters != null && accuracyMeters >= 0 ? (
        <Circle
          testID={`${testID ?? 'user-location'}-accuracy`}
          center={coordinate}
          radius={accuracyMeters}
          fillColor={ACCURACY_HALO_COLOR}
          strokeColor={ACCURACY_RING_COLOR}
          strokeWidth={1}
        />
      ) : null}
      <MapMarker
        marker={{ ...marker, color: USER_PIN_COLOR }}
        accessibilityLabel={title ?? 'Your current location'}
        testID={testID ?? 'user-location'}
      />
    </>
  );
}