import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { SafetyMap } from '@/components/safety-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useLiveLocation } from '@/hooks/use-live-location';
import { strings } from '@/i18n/strings';

export default function HomeScreen() {
  const { position } = useLiveLocation();

  return (
    <View style={styles.container}>
      <SafetyMap liveLocation={position} />
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