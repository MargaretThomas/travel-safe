import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CountdownCard } from '@/components/emergency/countdown-card';
import { EmergencyEndedCard } from '@/components/emergency/emergency-ended-card';
import { EmergencyStatusCard } from '@/components/emergency/emergency-status-card';
import { SosTriggerButton } from '@/components/emergency/sos-trigger-button';
import { FeatureCard } from '@/components/feature-card';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useEmergencyLocation } from '@/hooks/use-emergency-location';
import { strings } from '@/i18n/strings';
import {
  SOS_COUNTDOWN_SECONDS,
  SOS_LOCATION_UPDATE_INTERVAL_MS,
  buildAlertStatusText,
  countdownRemainingMs,
  formatAccuracy,
} from '@/lib/emergency';
import { useEmergencyStore } from '@/store/emergency-store';
import { useTrustedContactsStore } from '@/store/trusted-contacts-store';

export default function EmergencyScreen() {
  const contacts = useTrustedContactsStore((state) => state.contacts);
  const loadContacts = useTrustedContactsStore((state) => state.loadContacts);

  const phase = useEmergencyStore((state) => state.phase);
  const countdownEndsAt = useEmergencyStore((state) => state.countdownEndsAt);
  const lastPosition = useEmergencyStore((state) => state.lastPosition);
  const recipientCount = useEmergencyStore((state) => state.recipientCount);
  const alertSent = useEmergencyStore((state) => state.alertSent);
  const deliveredUpdates = useEmergencyStore((state) => state.deliveredUpdates);
  const activate = useEmergencyStore((state) => state.activate);
  const cancel = useEmergencyStore((state) => state.cancel);
  const confirm = useEmergencyStore((state) => state.confirm);
  const updateLocation = useEmergencyStore((state) => state.updateLocation);
  const sendPendingUpdate = useEmergencyStore((state) => state.sendPendingUpdate);
  const endEmergency = useEmergencyStore((state) => state.endEmergency);
  const reset = useEmergencyStore((state) => state.reset);

  const { position, error: locationError } = useEmergencyLocation();

  const phones = useMemo(() => contacts.map((contact) => contact.phone), [contacts]);
  const hasRecipients = phones.length > 0;

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (position) {
      updateLocation(position);
    }
  }, [position, updateLocation]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (phase !== 'counting' || countdownEndsAt == null) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (countdownRemainingMs(countdownEndsAt, current) <= 0) {
        void confirm();
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, countdownEndsAt, confirm]);

  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => {
      void sendPendingUpdate(Date.now());
    }, Math.floor(SOS_LOCATION_UPDATE_INTERVAL_MS / 3));
    return () => clearInterval(id);
  }, [phase, sendPendingUpdate]);

  const remainingSeconds =
    phase === 'counting' && countdownEndsAt != null
      ? Math.max(0, Math.ceil(countdownRemainingMs(countdownEndsAt, now) / 1000))
      : SOS_COUNTDOWN_SECONDS;

  const accuracyText = formatAccuracy(lastPosition?.accuracyMeters) ?? '—';

  const handleTrigger = () => {
    setNow(Date.now());
    activate(phones);
  };

  const handleDone = () => {
    reset();
    router.back();
  };

  return (
    <ScreenShell
      testID="emergency-screen"
      title={strings.emergency.screen.title}
      subtitle={strings.emergency.screen.subtitle}>
      {phase === 'idle' ? (
        <>
          <FeatureCard
            testID="emergency-idle-card"
            title={strings.emergency.homeEntry.title}
            body={strings.emergency.idle.triggerHint}>
            <View style={styles.accuracyRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.emergency.idle.accuracy}
              </ThemedText>
              <ThemedText testID="emergency-accuracy" type="smallBold">
                {locationError ? strings.emergency.locationUnavailable : accuracyText}
              </ThemedText>
            </View>
          </FeatureCard>

          <View style={styles.triggerZone}>
            <SosTriggerButton
              testID="sos-trigger"
              label={strings.emergency.trigger.label}
              onPress={handleTrigger}
            />
          </View>
        </>
      ) : null}

      {phase === 'counting' ? (
        <CountdownCard
          testID="sos-countdown"
          remainingSeconds={remainingSeconds}
          eyebrow={strings.emergency.countdown.eyebrow}
          prompt={strings.emergency.countdown.prompt}
          cancelLabel={strings.emergency.countdown.cancel}
          onCancel={cancel}
        />
      ) : null}

      {phase === 'active' ? (
        <EmergencyStatusCard
          testID="sos-status"
          statusTitle={strings.emergency.active.title}
          statusBody={strings.emergency.active.sharing}
          alertStatus={buildAlertStatusText({
            recipientCount,
            alertSent,
            hasRecipients,
          })}
          rows={[
            {
              label: strings.emergency.active.accuracy,
              value: accuracyText,
              valueTestID: 'emergency-active-accuracy',
            },
            {
              label: strings.emergency.active.updates,
              value: String(deliveredUpdates),
              valueTestID: 'emergency-updates-count',
            },
          ]}
          endLabel={strings.emergency.active.end}
          onEnd={() => endEmergency()}
        />
      ) : null}

      {phase === 'ended' ? (
        <EmergencyEndedCard
          testID="sos-ended"
          title={strings.emergency.ended.title}
          body={strings.emergency.ended.body}
          doneLabel={strings.emergency.ended.done}
          onDone={handleDone}
        />
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  triggerZone: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});