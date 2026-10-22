import { strings } from '@/i18n/strings';

import type {
  IWelcomeAction,
  IWelcomeFeature,
  IWelcomeToken,
  TWelcomeIcon,
} from '@/components/ui/welcome/types';

/**
 * The copy the welcome screen shows when the caller does not override it.
 * Everything here comes from `i18n/strings` so no user-visible text is
 * hardcoded inside the component.
 */
export interface IWelcomeCopy {
  wordmark: string;
  eyebrow: string;
  headline: { lead: string; tail: string };
  features: {
    problem: { title: string; body: string };
    solution: { title: string; body: string };
    control: { title: string; body: string };
  };
  cta: string;
  legal: string;
}

/**
 * The whole welcome screen reduced to data: the wordmark, the headline runs,
 * the trust points, the call to action and the fine print.
 */
export interface IWelcomeContent {
  wordmark: string;
  eyebrow: string;
  headline: IWelcomeToken[];
  features: IWelcomeFeature[];
  actions: IWelcomeAction[];
  legal: string;
}

export const DEFAULT_WELCOME_COPY: IWelcomeCopy = strings.welcome;

const FEATURE_ICONS: Record<keyof IWelcomeCopy['features'], TWelcomeIcon> = {
  problem: 'schedule',
  solution: 'check',
  control: 'lock',
};

/**
 * Turns the raw copy into the content the component renders. The headline is
 * split into a brand-coloured lead and a plain tail, and the three trust
 * points are paired with the icons that match them.
 */
export function buildWelcomeContent(copy: IWelcomeCopy = DEFAULT_WELCOME_COPY): IWelcomeContent {
  const features: IWelcomeFeature[] = (Object.keys(copy.features) as (keyof IWelcomeCopy['features'])[]).map(
    (key) => ({
      key,
      icon: FEATURE_ICONS[key],
      title: copy.features[key].title,
      body: copy.features[key].body,
    }),
  );

  const actions: IWelcomeAction[] = [
    {
      key: 'start',
      label: copy.cta,
      variant: 'primary',
      testID: 'welcome-action-start',
    },
  ];

  return {
    wordmark: copy.wordmark,
    eyebrow: copy.eyebrow,
    headline: [
      { kind: 'word', text: copy.headline.lead, tone: 'brand' },
      { kind: 'word', text: copy.headline.tail, tone: 'default' },
    ],
    features,
    actions,
    legal: copy.legal,
  };
}

export const WELCOME_CONTENT = buildWelcomeContent();
