import { router } from 'expo-router';
import { WelcomeScreenV4 } from '@/components/ui/blocks/welcome-v4';
import { strings } from '@/i18n/strings';

const START_ACTION = {
  key: 'start',
  label: strings.welcome.cta,
  variant: 'primary' as const,
  testID: 'onboarding-start',
};

export default function IntroScreen() {
  return (
    <WelcomeScreenV4
      onActionPress={() => {
        router.push('/onboarding/name')
      }}
    />
  );
}
