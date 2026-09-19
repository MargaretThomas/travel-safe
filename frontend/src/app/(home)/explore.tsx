import { StyleSheet, View } from 'react-native';

import { SafetyLegend } from '@/components/safety-legend';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { strings } from '@/i18n/strings';
import { rankSafetyZones, safetyHexForScore } from '@/lib/safety-map';

export default function ExploreScreen() {
  const zones = rankSafetyZones();

  return (
    <ScreenShell testID="explore-screen" title={strings.explore.title} subtitle={strings.explore.subtitle}>
      <SafetyLegend />

      <ThemedText type="smallBold">{strings.explore.rankTitle}</ThemedText>

      {zones.map((zone) => (
        <ThemedView
          key={zone.id}
          testID={`explore-zone-${zone.id}`}
          type="backgroundElement"
          style={styles.row}>
          <View style={[styles.dot, { backgroundColor: safetyHexForScore(zone.safetyScore) }]} />
          <ThemedText type="small" style={styles.name}>
            {zone.name}
          </ThemedText>
          <View style={styles.score}>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.explore.scoreLabel}
            </ThemedText>
            <ThemedText type="smallBold">{Math.round(zone.safetyScore)}</ThemedText>
          </View>
        </ThemedView>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  name: {
    flex: 1,
  },
  score: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
});