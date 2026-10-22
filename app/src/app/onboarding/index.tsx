import { router } from 'expo-router';

import { WelcomeScreen } from '@/components/ui/welcome';
import { strings } from '@/i18n/strings';

const START_ACTION = {
  key: 'start',
  label: strings.welcome.cta,
  variant: 'primary' as const,
  testID: 'onboarding-start',
};

export default function IntroScreen() {
  return (
    <WelcomeScreen
      testID="onboarding-index"
      actions={[START_ACTION]}
      onActionPress={() => router.push('/onboarding/name')}
    />
  );
}
