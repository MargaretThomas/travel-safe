import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { strings } from '@/i18n/strings';
import { safetyHexForScore } from '@/lib/safety-map';

const GRADIENT_HEX_STOPS = [0, 25, 50, 75, 100].map(safetyHexForScore);
const GRADIENT = `linear-gradient(90deg, ${GRADIENT_HEX_STOPS.join(', ')})`;

export function SafetyLegend() {
  return (
    <ThemedView testID="safety-legend" type="backgroundElement" style={styles.container}>
      <ThemedText type="smallBold">{strings.safetyMap.legendCaption}</ThemedText>
      <View style={styles.gradientRow}>
        <ThemedText type="small">{strings.legend.dangerous}</ThemedText>
        <View testID="safety-legend-gradient" style={[styles.gradient, { experimental_backgroundImage: GRADIENT }]} />
        <ThemedText type="small">{strings.legend.safe}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: BottomTabInset + Spacing.four,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gradientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  gradient: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
});