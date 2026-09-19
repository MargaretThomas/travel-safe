import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScoreExplanationModal } from '@/components/score-explanation-modal';
import { SafetyLegend } from '@/components/safety-legend';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSafetyHeatmap } from '@/hooks/use-safety-heatmap';
import { strings } from '@/i18n/strings';
import { fetchHaloList, type Halo } from '@/lib/api/halo';
import type { HeatmapCell } from '@/lib/api/trips';
import { safetyZonesToHeatmapCells } from '@/lib/map/heatmap-geojson';
import {
  buildDemoSafetyInsight,
  buildHaloInsight,
  buildSafetyInsight,
  type ScoreInsight,
} from '@/lib/score-insights';
import {
  MOCK_SAFETY_ZONES,
  rankSafetyZones,
  safetyHexForScore,
  type SafetyZone,
} from '@/lib/safety-map';

const fallbackHeatmap = safetyZonesToHeatmapCells(MOCK_SAFETY_ZONES);

export default function ExploreScreen() {
  const safety = useSafetyHeatmap(null, fallbackHeatmap);
  const [halos, setHalos] = useState<Halo[]>([]);
  const [haloError, setHaloError] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<ScoreInsight | null>(
    null,
  );

  const officialLocations = useMemo(
    () =>
      safety.cells
        .filter(
          (cell): cell is HeatmapCell & { safety_score: number } =>
            safety.source === 'api' &&
            typeof cell.safety_score === 'number' &&
            Number.isFinite(cell.safety_score),
        )
        .sort((a, b) => b.safety_score - a.safety_score)
        .slice(0, 10),
    [safety.cells, safety.source],
  );

  const demoZones = useMemo(() => rankSafetyZones().slice(0, 10), []);

  useEffect(() => {
    let cancelled = false;
    void fetchHaloList()
      .then((response) => {
        if (cancelled) return;
        setHalos(response.items);
        setHaloError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setHalos([]);
        setHaloError(
          error instanceof Error ? error.message : 'Halo request failed',
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const usingOfficialData = officialLocations.length > 0;

  return (
    <>
      <ScreenShell
        testID="explore-screen"
        title={strings.explore.title}
        subtitle="Tap any score to understand what it means, why it looks that way and what to do next.">
        <SafetyLegend />

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">Safety recommendations</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {usingOfficialData
              ? 'DataFirst / SAPS 2025/2026 · evidence-backed'
              : 'Demo fallback · not official safety evidence'}
          </ThemedText>
        </View>

        {usingOfficialData
          ? officialLocations.map((cell) => (
              <OfficialSafetyRow
                key={cell.id}
                cell={cell}
                onPress={() => setSelectedInsight(buildSafetyInsight(cell))}
              />
            ))
          : demoZones.map((zone) => (
              <DemoSafetyRow
                key={zone.id}
                zone={zone}
                onPress={() =>
                  setSelectedInsight(buildDemoSafetyInsight(zone))
                }
              />
            ))}

        {safety.error ? (
          <ThemedText type="small" themeColor="textSecondary">
            Live safety data is unavailable right now, so the prototype scores
            above are shown only as a UI fallback.
          </ThemedText>
        ) : null}

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">Halo recommendations</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Community visitability is separate from the official safety score.
          </ThemedText>
        </View>

        {halos.map((halo) => (
          <HaloRow
            key={halo.id}
            halo={halo}
            onPress={() => setSelectedInsight(buildHaloInsight(halo))}
          />
        ))}

        {halos.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {haloError
              ? 'Halo recommendations are temporarily unavailable.'
              : 'No Halo community evidence is available yet.'}
          </ThemedText>
        ) : null}
      </ScreenShell>

      <ScoreExplanationModal
        insight={selectedInsight}
        onClose={() => setSelectedInsight(null)}
      />
    </>
  );
}

function OfficialSafetyRow({
  cell,
  onPress,
}: {
  cell: HeatmapCell & { safety_score: number };
  onPress: () => void;
}) {
  const insight = buildSafetyInsight(cell);
  return (
    <Pressable
      testID={'explore-location-' + cell.id}
      accessibilityRole="button"
      accessibilityLabel={
        'Explain safety score for ' + (cell.label || 'this location')
      }
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View
          style={[styles.dot, { backgroundColor: insight.bandColor }]}
        />
        <View style={styles.copy}>
          <ThemedText type="smallBold">
            {cell.label || 'Police-station area'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {insight.bandLabel} · tap for evidence
          </ThemedText>
        </View>
        <View style={styles.score}>
          <ThemedText type="small" themeColor="textSecondary">
            Safety
          </ThemedText>
          <ThemedText type="smallBold">
            {Math.round(cell.safety_score)}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function DemoSafetyRow({
  zone,
  onPress,
}: {
  zone: SafetyZone;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={'explore-zone-' + zone.id}
      accessibilityRole="button"
      accessibilityLabel={'Explain demo score for ' + zone.name}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View
          style={[
            styles.dot,
            { backgroundColor: safetyHexForScore(zone.safetyScore) },
          ]}
        />
        <View style={styles.copy}>
          <ThemedText type="smallBold">{zone.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Prototype score · tap to understand the limitation
          </ThemedText>
        </View>
        <View style={styles.score}>
          <ThemedText type="small" themeColor="textSecondary">
            Demo
          </ThemedText>
          <ThemedText type="smallBold">
            {Math.round(zone.safetyScore)}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function HaloRow({ halo, onPress }: { halo: Halo; onPress: () => void }) {
  const insight = buildHaloInsight(halo);
  return (
    <Pressable
      testID={'explore-halo-' + halo.id}
      accessibilityRole="button"
      accessibilityLabel={'Explain Halo recommendation for ' + halo.name}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View
          style={[styles.dot, { backgroundColor: insight.bandColor }]}
        />
        <View style={styles.copy}>
          <ThemedText type="smallBold">{halo.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {halo.location_label} · {insight.bandLabel}
          </ThemedText>
        </View>
        <View style={styles.score}>
          <ThemedText type="small" themeColor="textSecondary">
            Visitability
          </ThemedText>
          <ThemedText type="smallBold">
            {insight.score == null ? 'New' : insight.score}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
  score: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
});
