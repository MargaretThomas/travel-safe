import { StyleSheet, View } from 'react-native';

import { PlaceSearchField } from '@/components/trip/place-search-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { strings } from '@/i18n/strings';
import type { PlaceSuggestion } from '@/lib/map/geocoding';
import type { MapCoordinate } from '@/lib/map/map.types';

export type TripPlannerCardProps = {
  proximity?: MapCoordinate | null;
  canUseCurrentLocation: boolean;
  statusMessage?: string | null;
  onSelectOrigin: (place: PlaceSuggestion) => void;
  onSelectDestination: (place: PlaceSuggestion) => void;
  onUseCurrentLocation: () => void;
};

export function TripPlannerCard({
  proximity,
  canUseCurrentLocation,
  statusMessage,
  onSelectOrigin,
  onSelectDestination,
  onUseCurrentLocation,
}: TripPlannerCardProps) {
  return (
    <ThemedView type="backgroundSelected" style={styles.card} testID="trip-plan-card">
      <ThemedText type="smallBold">{strings.trip.title}</ThemedText>
      <PlaceSearchField
        testID="trip-origin-input"
        label={strings.trip.originLabel}
        placeholder={strings.trip.originPlaceholder}
        proximity={proximity}
        actionLabel={canUseCurrentLocation ? strings.trip.useCurrentLocation : undefined}
        onAction={canUseCurrentLocation ? onUseCurrentLocation : undefined}
        onSelect={onSelectOrigin}
      />
      <PlaceSearchField
        testID="trip-destination-input"
        label={strings.trip.destinationLabel}
        placeholder={strings.trip.destinationPlaceholder}
        proximity={proximity}
        onSelect={onSelectDestination}
      />
      {statusMessage ? (
        <View testID="trip-plan-status">
          <ThemedText type="small" themeColor="textSecondary">
            {statusMessage}
          </ThemedText>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
