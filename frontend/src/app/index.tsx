import { StyleSheet, View } from 'react-native';

import { SafetyMap } from '@/components/safety-map';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <SafetyMap />
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
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
  },
});
