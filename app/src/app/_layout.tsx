import '@/tasks';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, Suspense  } from 'react';
import { useColorScheme, View, Text, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useForegroundSync } from '@/hooks/use-foreground-sync';
import { registerBackgroundSync } from '@/lib/background';
import { configureNotifications } from '@/lib/notifications';
import { startServices } from '@/lib/services';
import { getAppStore, useAppStore } from '@/store';
import { SQLiteProvider } from "expo-sqlite";
import { db, DATABASE_NAME } from "@/db/client";

SplashScreen.preventAutoHideAsync().catch(() => undefined);
configureNotifications().catch(() => undefined);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrated = useAppStore((state) => state.hydrated);
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);
  const registered = useAppStore((state) => state.registered);
  // Migrations have to complete before `hydrate` reads any table, and the app must not render
  // screens that would query a schema which is not current yet. Startup is therefore gated
  // here rather than kicked off from an effect, which is what let the first render race ahead
  // of the migration.
  //
  const [startup, setStartup] = useState<{ error: Error | null }>({ error: null });
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await startServices();
        await getAppStore().getState().hydrate();
        if (!cancelled) setStartup({ error: null });
      } catch (error) {
        if (!cancelled) setStartup({ error: error instanceof Error ? error : new Error(String(error)) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  useEffect(() => {
    if (registered) void registerBackgroundSync();
  }, [registered]);

  useForegroundSync(hydrated && registered);

  if (startup.error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{"Error"}</Text>
        <Text>{startup.error.message}</Text>
      </View>
    );
  }

  if (!hydrated) return null;

  const ready = onboardingComplete && registered;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Suspense fallback={<ActivityIndicator size="large" />}>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        options={{ enableChangeListener: true }}
        useSuspense
      >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={ready}>
            <Stack.Screen name="(home)" />
            <Stack.Screen name="contacts" />
            <Stack.Screen name="settings" />
          </Stack.Protected>
          <Stack.Protected guard={!ready}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
          </ThemeProvider>
      </SQLiteProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}
