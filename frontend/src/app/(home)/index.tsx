import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapStatusCard } from '@/components/map/map-status-card';
import { SafetyMap } from '@/components/map/safety-map';
import { SafetyLegend } from '@/components/safety-legend';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useMapLocation } from '@/hooks/use-map-location';
import { strings } from '@/i18n/strings';
import type { LivePosition } from '@/lib/location';
import type { MapCircle } from '@/lib/map/map.types';
import { buildHeatCircles, MOCK_SAFETY_ZONES } from '@/lib/safety-map';

const heatCircles: MapCircle[] = buildHeatCircles(MOCK_SAFETY_ZONES).map((circle) => ({
  id: circle.id,
  center: circle.center,
  radiusMeters: circle.radius,
  fillColor: circle.color,
  strokeColor: 'transparent',
  strokeWidth: 0,
}));

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { position, accuracyMeters, status, retry } = useMapLocation();

  const liveLocation = useMemo<LivePosition | null>(
    () => (position ? { latitude: position.latitude, longitude: position.longitude } : null),
    [position],
  );

  const showLegend = status === 'ready' || status === 'inaccurate' || status === 'stale';

  return (
    <View style={styles.container}>
      <SafetyMap
        liveLocation={liveLocation}
        accuracyMeters={accuracyMeters}
        circles={heatCircles}
      />

      <View style={[styles.overlay, { top: insets.top + Spacing.two }]} pointerEvents="box-none">
        <MapStatusCard status={status} onRetry={retry} />
        {showLegend ? <SafetyLegend /> : null}
      </View>

      <View style={styles.entries}>
        <Pressable
          testID="home-sos-entry"
          accessibilityRole="button"
          onPress={() => router.push('/emergency')}
          style={styles.entryHitbox}>
          {({ pressed }) => (
            <ThemedView
              type="backgroundSelected"
              style={[styles.entry, pressed && styles.entryPressed]}>
              <ThemedText type="smallBold" themeColor="brandText">
                {strings.emergency.homeEntry.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.emergency.homeEntry.body}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="brandText" style={styles.cta}>
                {strings.emergency.homeEntry.cta}
              </ThemedText>
            </ThemedView>
          )}
        </Pressable>
        <Pressable
          testID="home-trusted-contacts-entry"
          accessibilityRole="button"
          onPress={() => router.push('/trusted-contacts')}
          style={styles.entryHitbox}>
          {({ pressed }) => (
            <ThemedView
              type="backgroundSelected"
              style={[styles.entry, pressed && styles.entryPressed]}>
              <ThemedText type="smallBold">{strings.trustedContacts.homeEntry.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.trustedContacts.homeEntry.body}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="brandText" style={styles.cta}>
                {strings.trustedContacts.homeEntry.cta}
              </ThemedText>
            </ThemedView>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    gap: Spacing.two,
  },
  entries: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.four,
    left: Spacing.three,
    right: Spacing.three,
    gap: Spacing.two,
  },
  entryHitbox: {
    width: '100%',
  },
  entry: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  entryPressed: {
    opacity: 0.8,
  },
  cta: {
    textDecorationLine: 'underline',
    marginTop: Spacing.one,
  },
});