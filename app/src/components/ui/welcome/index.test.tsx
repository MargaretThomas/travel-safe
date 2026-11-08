import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { WelcomeScreen } from './index';

/** Colours from the light theme that the screen must paint with. */
const BRAND = '#1f6f5c';
const BACKGROUND_ELEMENT = '#ffffff';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(element);
  });
  if (!tree) throw new Error('The screen did not render.');
  return tree;
}

/** Host (native) elements carrying a testID; composites forward it downwards. */
function hosts(tree: ReactTestRenderer, testID: string): ReactTestInstance[] {
  return tree.root.findAll((node) => typeof node.type === 'string' && node.props.testID === testID);
}

function byTestID(tree: ReactTestRenderer, testID: string): ReactTestInstance {
  const [match] = hosts(tree, testID);
  if (!match) throw new Error(`No element with testID "${testID}".`);
  return match;
}

function collectText(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(collectText).join('');
  if (typeof value === 'object' && 'props' in value) {
    return collectText((value as { props: { children?: unknown } }).props.children);
  }
  return '';
}

function textOf(node: { props: { children?: unknown } }): string {
  return collectText(node.props.children);
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, entry) => ({ ...merged, ...flattenStyle(entry) }),
      {},
    );
  }
  if (style && typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

function press(tree: ReactTestRenderer, testID: string): void {
  const [pressable] = tree.root.findAll(
    (node) =>
      typeof node.type !== 'string' &&
      node.props.testID === testID &&
      typeof node.props.onPress === 'function',
  );
  if (!pressable) throw new Error(`No pressable with testID "${testID}".`);
  act(() => {
    pressable.props.onPress();
  });
}

describe('WelcomeScreen', () => {
  it('shows the brand wordmark, the headline, the trust points and the fine print', () => {
    const tree = render(<WelcomeScreen />);

    expect(textOf(byTestID(tree, 'welcome-wordmark'))).toBe('Travel Safe');
    expect(textOf(byTestID(tree, 'welcome-headline'))).toBe('A safety net that checks on you');
    expect(textOf(byTestID(tree, 'welcome-feature-problem'))).toContain('The problem');
    expect(textOf(byTestID(tree, 'welcome-feature-solution'))).toContain('How Travel Safe helps');
    expect(textOf(byTestID(tree, 'welcome-feature-control'))).toContain('You decide who is told');
    expect(textOf(byTestID(tree, 'welcome-legal'))).toContain('Your location history is deleted');
  });

  it('paints the lead of the headline in the brand colour', () => {
    const tree = render(<WelcomeScreen />);
    const lead = tree.root.findAll(
      (node) => typeof node.type === 'string' && textOf(node).trim() === 'A safety net',
    )[0];

    expect(flattenStyle(lead.props.style).color).toBe(BRAND);
  });

  it('uses the brand colour for the call to action', () => {
    const tree = render(<WelcomeScreen />);

    expect(flattenStyle(byTestID(tree, 'welcome-action-start').props.style).backgroundColor).toBe(
      BRAND,
    );
  });

  it('reports the pressed action to the caller', () => {
    const onActionPress = jest.fn();
    const tree = render(<WelcomeScreen onActionPress={onActionPress} />);

    press(tree, 'welcome-action-start');

    expect(onActionPress).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'start', label: 'Get started' }),
    );
  });

  it('takes the screen test identifier it is given', () => {
    const tree = render(<WelcomeScreen testID="onboarding-index" />);

    expect(byTestID(tree, 'onboarding-index')).toBeTruthy();
  });

  it('replaces the wordmark with custom artwork', () => {
    const tree = render(<WelcomeScreen logo={<Text testID="custom-logo">Travel Safe</Text>} />);

    expect(byTestID(tree, 'custom-logo')).toBeTruthy();
    expect(hosts(tree, 'welcome-wordmark')).toHaveLength(0);
  });

  it('renders a secondary action with the subtle treatment', () => {
    const tree = render(
      <WelcomeScreen
        actions={[
          { key: 'start', label: 'Get started', variant: 'primary', testID: 'welcome-action-start' },
          { key: 'skip', label: 'Skip for now', variant: 'secondary', testID: 'welcome-action-skip' },
        ]}
      />,
    );

    const skip = byTestID(tree, 'welcome-action-skip');
    expect(flattenStyle(skip.props.style).backgroundColor).toBe(BACKGROUND_ELEMENT);
    expect(textOf(skip)).toBe('Skip for now');
  });

  it('falls back to a generated test identifier for an action without one', () => {
    const tree = render(<WelcomeScreen actions={[{ key: 'start', label: 'Get started' }]} />);

    expect(byTestID(tree, 'welcome-action-start')).toBeTruthy();
  });

  it('drops the eyebrow and fine print when they are empty', () => {
    const tree = render(<WelcomeScreen eyebrow="" legal="" />);

    expect(hosts(tree, 'welcome-eyebrow')).toHaveLength(0);
    expect(hosts(tree, 'welcome-legal')).toHaveLength(0);
  });
});
