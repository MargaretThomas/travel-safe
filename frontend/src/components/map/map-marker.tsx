import { MapMarker as NativeMapMarker } from 'react-native-maps';

import type { MapMarker as MapMarkerModel } from '@/lib/map/map.types';

export type MapMarkerProps = {
  marker: MapMarkerModel;
  accessibilityLabel?: string;
  testID?: string;
};

export function MapMarker({ marker, accessibilityLabel, testID }: MapMarkerProps) {
  const label = accessibilityLabel ?? marker.title ?? marker.description ?? `Marker ${marker.id}`;

  return (
    <NativeMapMarker
      testID={testID ?? `map-marker-${marker.id}`}
      accessibilityLabel={label}
      identifier={marker.id}
      coordinate={marker.coordinate}
      title={marker.title}
      description={marker.description}
      {...(marker.color ? { pinColor: marker.color } : {})}
    />
  );
}