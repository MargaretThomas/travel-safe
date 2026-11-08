import { strings } from '@/i18n/strings';

import {
  buildWelcomeContent,
  DEFAULT_WELCOME_COPY,
  WELCOME_CONTENT,
  type IWelcomeCopy,
} from './welcome-content';

const copy: IWelcomeCopy = {
  wordmark: 'Travel Safe',
  eyebrow: 'Safety check-ins for people who travel alone',
  headline: { lead: 'A safety net', tail: 'that checks on you' },
  features: {
    problem: { title: 'The problem', body: 'Nobody may notice for days.' },
    solution: { title: 'How it helps', body: 'One tap on a schedule you choose.' },
    control: { title: 'You decide', body: 'Our server keeps track of your deadline.' },
  },
  cta: 'Get started',
  legal: 'Location history is deleted after 24 hours.',
};

describe('buildWelcomeContent', () => {
  it('uses the shared copy when nothing is overridden', () => {
    expect(DEFAULT_WELCOME_COPY).toBe(strings.welcome);
    expect(buildWelcomeContent().wordmark).toBe(strings.welcome.wordmark);
    expect(buildWelcomeContent().legal).toBe(strings.welcome.legal);
  });

  it('splits the headline into a brand lead and a plain tail', () => {
    const content = buildWelcomeContent(copy);

    expect(content.headline).toEqual([
      { kind: 'word', text: 'A safety net', tone: 'brand' },
      { kind: 'word', text: 'that checks on you', tone: 'default' },
    ]);
  });

  it('pairs every trust point with an icon and a stable key', () => {
    const content = buildWelcomeContent(copy);

    expect(content.features).toEqual([
      { key: 'problem', icon: 'schedule', title: 'The problem', body: 'Nobody may notice for days.' },
      { key: 'solution', icon: 'check', title: 'How it helps', body: 'One tap on a schedule you choose.' },
      { key: 'control', icon: 'lock', title: 'You decide', body: 'Our server keeps track of your deadline.' },
    ]);
  });

  it('offers a single primary call to action', () => {
    const content = buildWelcomeContent(copy);

    expect(content.actions).toHaveLength(1);
    expect(content.actions[0]).toMatchObject({
      key: 'start',
      label: 'Get started',
      variant: 'primary',
    });
    expect(content.actions[0].testID).toBeTruthy();
  });

  it('keeps feature keys and action keys unique', () => {
    const content = buildWelcomeContent(copy);
    const featureKeys = content.features.map((feature) => feature.key);
    const actionKeys = content.actions.map((action) => action.key);

    expect(new Set(featureKeys).size).toBe(featureKeys.length);
    expect(new Set(actionKeys).size).toBe(actionKeys.length);
  });

  it('never leaves a trust point without copy', () => {
    const content = buildWelcomeContent();

    expect(content.features.length).toBeGreaterThan(0);
    for (const feature of content.features) {
      expect(feature.title.trim()).not.toBe('');
      expect(feature.body.trim()).not.toBe('');
    }
  });

  it('never leaves an action without a label', () => {
    const content = buildWelcomeContent();

    for (const action of content.actions) {
      expect(action.label.trim()).not.toBe('');
    }
  });

  it('exposes a ready-made default content object', () => {
    expect(WELCOME_CONTENT).toEqual(buildWelcomeContent());
  });
});
