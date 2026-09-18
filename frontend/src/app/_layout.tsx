import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, useColorScheme } from 'react-native';
import { Suspense } from 'react';
import { db, DATABASE_NAME } from "@/db/client";
import { SQLiteProvider } from 'expo-sqlite';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import { View, Text } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { success, error: migrationError } = useMigrations(db, migrations);

  if (migrationError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      </View>
    );
  }

  return (
  <Suspense fallback={<ActivityIndicator size="large" />}>
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      options={{ enableChangeListener: true }}
      useSuspense
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </SQLiteProvider>
    </Suspense>
  );
}
