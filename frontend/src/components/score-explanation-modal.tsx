import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ScoreInsight } from '@/lib/score-insights';

export type ScoreExplanationModalProps = {
  insight: ScoreInsight | null;
  onClose: () => void;
};

export function ScoreExplanationModal({
  insight,
  onClose,
}: ScoreExplanationModalProps) {
  return (
    <Modal
      visible={insight != null}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="background" style={styles.sheet}>
          {insight ? (
            <ScrollView
              testID="score-explanation-modal"
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <ThemedText type="subtitle">{insight.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {insight.locationLabel}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close score explanation"
                  onPress={onClose}
                  hitSlop={8}
                  style={styles.closeButton}>
                  <ThemedText type="smallBold">Close</ThemedText>
                </Pressable>
              </View>

              <View style={styles.scoreRow}>
                <View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {insight.scoreLabel}
                  </ThemedText>
                  <ThemedText type="title">
                    {insight.score == null ? '—' : insight.score}
                  </ThemedText>
                </View>
                <View style={styles.bandWrap}>
                  <View
                    style={[
                      styles.bandDot,
                      { backgroundColor: insight.bandColor },
                    ]}
                  />
                  <ThemedText type="smallBold">
                    {insight.bandLabel}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {insight.confidenceLabel}
                  </ThemedText>
                </View>
              </View>

              <Section title="What this means">
                <ThemedText>{insight.meaning}</ThemedText>
              </Section>

              <Section title="Why this score">
                {insight.why.map((line, index) => (
                  <View key={index} style={styles.bulletRow}>
                    <ThemedText themeColor="textSecondary">•</ThemedText>
                    <ThemedText style={styles.bulletText}>{line}</ThemedText>
                  </View>
                ))}
              </Section>

              <Section title="Recommendation">
                <ThemedView
                  type="backgroundElement"
                  style={[
                    styles.recommendation,
                    { borderLeftColor: insight.bandColor },
                  ]}>
                  <ThemedText>{insight.recommendation}</ThemedText>
                </ThemedView>
              </Section>

              <Section title="How it is calculated">
                <ThemedText type="small">{insight.methodology}</ThemedText>
              </Section>

              <Section title="Source & data notes">
                <ThemedText type="smallBold">{insight.sourceLabel}</ThemedText>
                {insight.notes.map((note, index) => (
                  <View key={index} style={styles.bulletRow}>
                    <ThemedText themeColor="textSecondary">•</ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.bulletText}>
                      {note}
                    </ThemedText>
                  </View>
                ))}
              </Section>
            </ScrollView>
          ) : null}
        </ThemedView>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  closeButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.four,
  },
  bandWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  bandDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  section: {
    gap: Spacing.two,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletText: {
    flex: 1,
  },
  recommendation: {
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    padding: Spacing.three,
  },
});
