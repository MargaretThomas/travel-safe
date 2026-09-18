import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { checkBackendHealth } from './src/api/health';

export default function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    checkBackendHealth().then((connected) => {
      if (isMounted) {
        setIsConnected(connected);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const status =
    isConnected === null
      ? 'Checking backend…'
      : isConnected
        ? 'Backend connected'
        : 'Backend not connected';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travel Safe</Text>
      <Text accessibilityRole="text">{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
