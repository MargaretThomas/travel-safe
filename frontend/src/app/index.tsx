import { Pressable, StyleSheet, View } from 'react-native';

import { SafetyMap } from '@/components/safety-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLiveLocation } from '@/hooks/use-live-location';
import { strings } from '@/i18n/strings';

export default function HomeScreen() {
  const { position, error, isLocating, retry } = useLiveLocation();

  return (
    <View style={styles.container}>
      <SafetyMap liveLocation={position} />
      <ThemedView testID="safety-map-header" type="backgroundElement" style={styles.header}>
        <ThemedText type="title">{strings.safetyMap.headerTitle}</ThemedText>
        <ThemedText themeColor="textSecondary">{strings.safetyMap.headerSubtitle}</ThemedText>
        {isLocating && (
          <ThemedText testID="safety-map-location-status" type="small" themeColor="textSecondary">
            {strings.safetyMap.locating}
          </ThemedText>
        )}
        {error && (
          <Pressable testID="safety-map-location-retry" onPress={retry}>
            <ThemedText type="small" style={styles.retryText}>
              {strings.safetyMap.locationUnavailable}
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  retryText: {
    textDecorationLine: 'underline',
  },
});