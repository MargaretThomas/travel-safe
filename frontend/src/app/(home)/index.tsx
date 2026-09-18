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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  entryHitbox: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.four,
    left: Spacing.three,
    right: Spacing.three,
  },
  entry: {
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
  entryPressed: {
    opacity: 0.8,
  },
  cta: {
    textDecorationLine: 'underline',
    marginTop: Spacing.one,
  },
});