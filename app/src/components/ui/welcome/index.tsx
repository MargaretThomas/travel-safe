import React, { memo, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { PrimaryButton } from "@/components/primary-button";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { WELCOME_CONTENT } from "@/lib/welcome-content";

import {
  WELCOME_ACTION_GAP,
  WELCOME_EYEBROW_LETTER_SPACING,
  WELCOME_EYEBROW_LINE_HEIGHT,
  WELCOME_EYEBROW_SIZE,
  WELCOME_FEATURE_CHIP_SIZE,
  WELCOME_FEATURE_GAP,
  WELCOME_FEATURE_ICON_SIZE,
  WELCOME_FEATURE_LIST_GAP,
  WELCOME_FEATURE_PADDING,
  WELCOME_FEATURE_RADIUS,
  WELCOME_HEADLINE_GAP,
  WELCOME_HEADLINE_LINE_HEIGHT,
  WELCOME_HEADLINE_SIZE,
  WELCOME_HORIZONTAL_PADDING,
  WELCOME_LEGAL_LINE_HEIGHT,
  WELCOME_LEGAL_SIZE,
  WELCOME_MARK_ICON_SIZE,
  WELCOME_MARK_SIZE,
  WELCOME_MAX_WIDTH,
  WELCOME_RADIUS,
  WELCOME_WORDMARK_LINE_HEIGHT,
  WELCOME_WORDMARK_SIZE,
} from "./const";
import type {
  IWelcomeAction,
  IWelcomeFeature,
  IWelcomeScreenProps,
  IWelcomeToken,
  TWelcomeIcon,
} from "./types";

interface IIconProps {
  size: number;
  color: string;
}

const BrandGlyph: React.FC<IIconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l7.5 2.9v5.4c0 4.7-3.2 8.6-7.5 10-4.3-1.4-7.5-5.3-7.5-10V5.9L12 3z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path
      d="M8.6 12.1l2.4 2.4 4.5-4.7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ScheduleGlyph: React.FC<IIconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} />
    <Path
      d="M12 7.2V12l3.2 1.9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckGlyph: React.FC<IIconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} />
    <Path
      d="M8.4 12.2l2.6 2.6 4.7-5.2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LockGlyph: React.FC<IIconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.6 10.4V8a4.4 4.4 0 018.8 0v2.4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5.9 10.4h12.2a1.3 1.3 0 011.3 1.3v6.7a1.3 1.3 0 01-1.3 1.3H5.9a1.3 1.3 0 01-1.3-1.3v-6.7a1.3 1.3 0 011.3-1.3z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  </Svg>
);

const GLYPHS: Record<TWelcomeIcon, React.FC<IIconProps>> = {
  brand: BrandGlyph,
  schedule: ScheduleGlyph,
  check: CheckGlyph,
  lock: LockGlyph,
};

const WelcomeGlyph: React.FC<{ icon: TWelcomeIcon; size: number; color: string }> = ({
  icon,
  size,
  color,
}) => {
  const Glyph = GLYPHS[icon];
  return <Glyph size={size} color={color} />;
};

const Headline = memo(function Headline({
  tokens,
  brandColor,
}: {
  tokens: IWelcomeToken[];
  brandColor: string;
}) {
  return (
    <ThemedText accessibilityRole="header" testID="welcome-headline" style={styles.headline}>
      {tokens.map((token, index) => (
        <Text
          key={`${token.text}-${index}`}
          style={token.tone === "brand" ? { color: brandColor } : null}
        >
          {token.text}
          {index < tokens.length - 1 ? " " : ""}
        </Text>
      ))}
    </ThemedText>
  );
});

const Feature = memo(function Feature({ feature }: { feature: IWelcomeFeature }) {
  const theme = useTheme();

  return (
    <View
      testID={`welcome-feature-${feature.key}`}
      style={[
        styles.feature,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <View style={[styles.featureChip, { backgroundColor: theme.backgroundSelected }]}>
        <WelcomeGlyph
          icon={feature.icon}
          size={WELCOME_FEATURE_ICON_SIZE}
          color={theme.brand}
        />
      </View>
      <View style={styles.featureBody}>
        <ThemedText type="smallBold" style={styles.featureTitle}>
          {feature.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {feature.body}
        </ThemedText>
      </View>
    </View>
  );
});

const WelcomeScreen: React.FC<IWelcomeScreenProps> = ({
  wordmark = WELCOME_CONTENT.wordmark,
  logo,
  eyebrow = WELCOME_CONTENT.eyebrow,
  headline = WELCOME_CONTENT.headline,
  features = WELCOME_CONTENT.features,
  actions = WELCOME_CONTENT.actions,
  legal = WELCOME_CONTENT.legal,
  testID = "welcome-screen",
  style,
  onActionPress,
}) => {
  const theme = useTheme();

  const handlePress = useCallback(
    (action: IWelcomeAction) => {
      onActionPress?.(action);
    },
    [onActionPress],
  );

  return (
    <SafeAreaView
      testID={testID}
      edges={["top", "left", "right", "bottom"]}
      style={[styles.root, { backgroundColor: theme.background }, style]}
    >
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: theme.brand }]}>
          <WelcomeGlyph icon="brand" size={WELCOME_MARK_ICON_SIZE} color={theme.brandText} />
        </View>
        {logo ?? (
          <ThemedText testID="welcome-wordmark" style={styles.wordmark}>
            {wordmark}
          </ThemedText>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {eyebrow ? (
          <ThemedText
            testID="welcome-eyebrow"
            themeColor="brand"
            style={styles.eyebrow}
          >
            {eyebrow.toUpperCase()}
          </ThemedText>
        ) : null}

        <Headline tokens={headline} brandColor={theme.brand} />

        <View style={styles.features}>
          {features.map((feature) => (
            <Feature key={feature.key} feature={feature} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.actions}>
          {actions.map((action) => (
            <PrimaryButton
              key={action.key}
              testID={action.testID ?? `welcome-action-${action.key}`}
              label={action.label}
              variant={action.variant === "secondary" ? "subtle" : "primary"}
              onPress={() => handlePress(action)}
            />
          ))}
        </View>

        {legal ? (
          <ThemedText testID="welcome-legal" themeColor="textSecondary" style={styles.legal}>
            {legal}
          </ThemedText>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    width: "100%",
    maxWidth: WELCOME_MAX_WIDTH,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: WELCOME_FEATURE_GAP,
    paddingHorizontal: WELCOME_HORIZONTAL_PADDING,
    paddingTop: WELCOME_FEATURE_GAP,
    paddingBottom: WELCOME_FEATURE_LIST_GAP,
  },
  mark: {
    width: WELCOME_MARK_SIZE,
    height: WELCOME_MARK_SIZE,
    borderRadius: WELCOME_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontSize: WELCOME_WORDMARK_SIZE,
    lineHeight: WELCOME_WORDMARK_LINE_HEIGHT,
    fontWeight: "600",
  },
  content: {
    width: "100%",
    maxWidth: WELCOME_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: WELCOME_HORIZONTAL_PADDING,
    paddingBottom: WELCOME_HEADLINE_GAP,
  },
  eyebrow: {
    fontSize: WELCOME_EYEBROW_SIZE,
    lineHeight: WELCOME_EYEBROW_LINE_HEIGHT,
    fontWeight: "700",
    letterSpacing: WELCOME_EYEBROW_LETTER_SPACING,
    marginBottom: WELCOME_FEATURE_GAP,
  },
  headline: {
    fontSize: WELCOME_HEADLINE_SIZE,
    lineHeight: WELCOME_HEADLINE_LINE_HEIGHT,
    fontWeight: "700",
  },
  features: {
    gap: WELCOME_FEATURE_LIST_GAP,
    marginTop: WELCOME_HEADLINE_GAP,
  },
  feature: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: WELCOME_FEATURE_GAP,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: WELCOME_FEATURE_RADIUS,
    padding: WELCOME_FEATURE_PADDING,
  },
  featureChip: {
    width: WELCOME_FEATURE_CHIP_SIZE,
    height: WELCOME_FEATURE_CHIP_SIZE,
    borderRadius: WELCOME_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  featureBody: {
    flex: 1,
    gap: WELCOME_FEATURE_GAP,
  },
  featureTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    width: "100%",
    maxWidth: WELCOME_MAX_WIDTH,
    alignSelf: "center",
    gap: WELCOME_FEATURE_GAP,
    paddingHorizontal: WELCOME_HORIZONTAL_PADDING,
    paddingTop: WELCOME_FEATURE_LIST_GAP,
  },
  actions: {
    gap: WELCOME_ACTION_GAP,
  },
  legal: {
    fontSize: WELCOME_LEGAL_SIZE,
    lineHeight: WELCOME_LEGAL_LINE_HEIGHT,
    textAlign: "center",
  },
});

export { WelcomeScreen };
export type {
  IWelcomeAction,
  IWelcomeFeature,
  IWelcomeScreenProps,
  IWelcomeToken,
  TWelcomeActionVariant,
  TWelcomeIcon,
  TWelcomeTokenTone,
} from "./types";
export default memo(WelcomeScreen);
