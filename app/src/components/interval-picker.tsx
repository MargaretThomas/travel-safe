import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Ruler } from './ui/base/ruler';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n/strings';
import {
  formatInterval,
  INTERVAL_PRESETS,
  INTERVAL_PRESET_MINUTES,
  nearestIntervalPreset,
} from '@/lib/intervals';

const RULER_HEIGHT = 132;
const MIN_TICK_STEP = 20;

export type IntervalPickerProps = {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
};

/**
 * Picks the check-in interval. The ruler is the control: it only ever rests on
 * one of the intervals, so it can never select a period that does not exist.
 * The presets below it do the same job for anyone who would rather tap than
 * swipe.
 */
export function IntervalPicker({ value, onChange, disabled = false }: IntervalPickerProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const preset = nearestIntervalPreset(value);

  const rulerWidth = useMemo(() => {
    const available = Math.min(windowWidth, MaxContentWidth) - Spacing.three * 2;
    return Math.max(available, 240);
  }, [windowWidth]);
  const step = Math.max(
    MIN_TICK_STEP,
    Math.round(rulerWidth / (INTERVAL_PRESETS.length - 1)),
  );

  // An interval that is not one of the presets (an older install, the server)
  // is snapped to the nearest one, because that is all the ruler can select.
  useEffect(() => {
    if (value !== preset.minutes) onChange(preset.minutes);
  }, [onChange, preset.minutes, value]);

  return (
    <View style={styles.container}>
      <View testID="interval-ruler" style={styles.ruler}>
        <Ruler
          height={RULER_HEIGHT}
          width={rulerWidth}
          values={INTERVAL_PRESET_MINUTES}
          step={step}
          value={preset.minutes}
          enabled={!disabled}
          enableHaptics
          tickColor={theme.textSecondary}
          activeTickColor={theme.brand}
          notchHeight={44}
          notchWidth={3}
          onValueChange={onChange}
        />
      </View>

      <ThemedText testID="interval-selected-label" type="subtitle" style={styles.label}>
        {formatInterval(preset.minutes)}
      </ThemedText>
      <ThemedText testID="interval-ruler-hint" type="small" themeColor="textSecondary">
        {strings.intervals.rulerHint}
      </ThemedText>

      <View
        style={styles.grid}
        accessibilityRole="radiogroup"
        accessibilityLabel={strings.intervals.presetsLabel}>
        {INTERVAL_PRESETS.map(({ minutes, key }) => {
          const selected = minutes === preset.minutes;
          return (
            <Pressable
              key={key}
              testID={`interval-${key}`}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(minutes)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: selected ? theme.brand : theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type={selected ? 'smallBold' : 'small'}>{formatInterval(minutes)}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  ruler: { alignItems: 'center', justifyContent: 'center' },
  label: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  pressed: { opacity: 0.7 },
});
