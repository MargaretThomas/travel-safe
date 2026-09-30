import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';

import { readDeviceState } from '@/lib/device-state';
import { captureCurrentLocation } from '@/lib/location';
import { cancelDeadlineReminders, notifyCheckInSynced, scheduleDeadlineReminders } from '@/lib/notifications';
import { getAuthServices, startServices } from '@/lib/services';
import { createAppStore, type AppState } from '@/store/app-store';

let instance: StoreApi<AppState> | null = null;

/**
 * Shared by screens and headless background tasks. Stays synchronous: only the repository
 * needs the database, and it is resolved on demand, so a background task that launches
 * without the UI still gets a working store.
 */
export function getAppStore(): StoreApi<AppState> {
  if (!instance) {
    const { session, api } = getAuthServices();
    instance = createAppStore({
      repository: async () => (await startServices()).repository,
      session,
      api,
      captureLocation: () => captureCurrentLocation(),
      readDevice: () => readDeviceState(),
      reminders: {
        schedule: (deadline, intervalMinutes, now) => scheduleDeadlineReminders(deadline, intervalMinutes, now),
        cancel: () => cancelDeadlineReminders(),
        notifySynced: (deadline, now) => notifyCheckInSynced(deadline, now),
      },
    });
  }
  return instance;
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(getAppStore(), selector);
}
