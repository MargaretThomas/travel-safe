import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Ruler } from './index';
import { flushAnimations } from './reanimated.mock';

jest.mock('react-native-reanimated', () => require('./reanimated.mock'));
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) => fn(...args),
}));
jest.mock('expo-haptics', () => ({
  AndroidHaptics: { Segment_Tick: 1 },
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: jest.fn(),
  performAndroidHapticsAsync: jest.fn(),
}));
jest.mock('@shopify/react-native-skia', () => {
  const ReactModule = require('react');
  return {
    Canvas: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactModule.createElement('Canvas', props, children),
    Group: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactModule.createElement('Group', props, children),
    Line: (props: Record<string, unknown>) => ReactModule.createElement('Line', props),
  };
});
jest.mock('react-native-gesture-handler', () => {
  const handlers: {
    onStart?: (event: unknown) => void;
    onChange?: (event: unknown) => void;
    onFinalize?: (event: unknown) => void;
    enabled?: boolean;
  } = {};
  const pan = {
    enabled(value: boolean) {
      handlers.enabled = value;
      return pan;
    },
    onStart(callback: (event: unknown) => void) {
      handlers.onStart = callback;
      return pan;
    },
    onChange(callback: (event: unknown) => void) {
      handlers.onChange = callback;
      return pan;
    },
    onFinalize(callback: (event: unknown) => void) {
      handlers.onFinalize = callback;
      return pan;
    },
  };
  return {
    Gesture: { Pan: () => pan },
    GestureDetector: ({ children }: { children?: React.ReactNode }) => children,
    handlers,
  };
});

const VALUES = [60, 1440, 2880, 4320, 10080, 20160, 43200, 86400, 129600, 259200, 525600];
const STEP = 20;

type Handlers = {
  onStart?: (event: unknown) => void;
  onChange?: (event: unknown) => void;
  onFinalize?: (event: unknown) => void;
  enabled?: boolean;
};

function handlers(): Handlers {
  return (require('react-native-gesture-handler') as { handlers: Handlers }).handlers;
}

function render(element: React.ReactElement): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(element);
  });
  if (!tree) throw new Error('The ruler did not render.');
  return tree;
}

function ticks(tree: ReactTestRenderer): ReactTestInstance[] {
  return tree.root.findAll((node) => (node.type as string) === 'Line');
}

function group(tree: ReactTestRenderer): ReactTestInstance {
  const [match] = tree.root.findAll((node) => (node.type as string) === 'Group');
  if (!match) throw new Error('The ruler did not render its ticks.');
  return match;
}

/** The offset the ruler is scrolled to, in pixels. */
function offset(tree: ReactTestRenderer): number {
  const transform = group(tree).props.transform as { value: { translateX: number }[] };
  return transform.value[0].translateX;
}

/** Drags the ruler by a number of pixels and lets go. */
function swipe(tree: ReactTestRenderer, changeX: number, velocityX = 0): void {
  const gesture = handlers();
  act(() => {
    gesture.onStart?.({ changeX: 0, velocityX: 0 });
    gesture.onChange?.({ changeX, velocityX: 0 });
    gesture.onFinalize?.({ changeX, velocityX });
    flushAnimations();
  });
}

describe('Ruler', () => {
  it('draws one tick for every value it can select', () => {
    const tree = render(<Ruler height={100} width={300} values={VALUES} step={STEP} />);

    // One tick per value, plus the marker in the middle.
    expect(ticks(tree)).toHaveLength(VALUES.length + 1);
  });

  it('starts with the selected value under the centre marker', () => {
    const tree = render(
      <Ruler height={100} width={300} values={VALUES} step={STEP} value={VALUES[4]} />,
    );

    expect(offset(tree)).toBe(-4 * STEP);
  });

  it('starts with the first value under the centre marker when nothing is selected', () => {
    const tree = render(<Ruler height={100} width={300} values={VALUES} step={STEP} />);

    expect(offset(tree)).toBe(0);
  });

  it('snaps a value that is not on the ruler to the nearest one', () => {
    const tree = render(
      <Ruler height={100} width={300} values={VALUES} step={STEP} value={5000} />,
    );

    expect(offset(tree)).toBe(-3 * STEP);
  });

  it('reports the value that moves under the centre marker', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <Ruler
        height={100}
        width={300}
        values={VALUES}
        step={STEP}
        value={VALUES[4]}
        onValueChange={onValueChange}
      />,
    );

    swipe(tree, -STEP);

    expect(onValueChange).toHaveBeenCalledWith(VALUES[5]);
  });

  it('never reports a value that is not on the ruler', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <Ruler
        height={100}
        width={300}
        values={VALUES}
        step={STEP}
        value={VALUES[4]}
        onValueChange={onValueChange}
      />,
    );

    swipe(tree, -STEP / 2);

    onValueChange.mock.calls.forEach(([reported]) => {
      expect(VALUES).toContain(reported);
    });
  });

  it('comes to rest on a whole tick', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <Ruler
        height={100}
        width={300}
        values={VALUES}
        step={STEP}
        value={VALUES[4]}
        onValueChange={onValueChange}
      />,
    );

    swipe(tree, -STEP * 3 + 4);

    expect(Math.abs(offset(tree) % STEP)).toBe(0);
  });

  it('stops at the last value and does not report past it', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <Ruler
        height={100}
        width={300}
        values={VALUES}
        step={STEP}
        value={VALUES[10]}
        onValueChange={onValueChange}
      />,
    );

    swipe(tree, -STEP * 4);

    expect(offset(tree)).toBe(-(VALUES.length - 1) * STEP);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('stops at the first value and does not report before it', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <Ruler
        height={100}
        width={300}
        values={VALUES}
        step={STEP}
        value={VALUES[0]}
        onValueChange={onValueChange}
      />,
    );

    swipe(tree, STEP * 4);

    expect(offset(tree)).toBe(0);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('moves to a value that was picked elsewhere', () => {
    const tree = render(
      <Ruler height={100} width={300} values={VALUES} step={STEP} value={VALUES[0]} />,
    );

    act(() => {
      tree.update(
        <Ruler height={100} width={300} values={VALUES} step={STEP} value={VALUES[6]} />,
      );
      flushAnimations();
    });

    expect(offset(tree)).toBe(-6 * STEP);
  });

  it('does not report the values it passes on its way to a value picked elsewhere', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <Ruler
        height={100}
        width={300}
        values={VALUES}
        step={STEP}
        value={VALUES[0]}
        onValueChange={onValueChange}
      />,
    );

    act(() => {
      tree.update(
        <Ruler
          height={100}
          width={300}
          values={VALUES}
          step={STEP}
          value={VALUES[8]}
          onValueChange={onValueChange}
        />,
      );
      flushAnimations();
    });

    expect(onValueChange).not.toHaveBeenCalled();
    expect(offset(tree)).toBe(-8 * STEP);
  });

  it('ignores swipes when it is disabled', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <Ruler
        height={100}
        width={300}
        values={VALUES}
        step={STEP}
        value={VALUES[4]}
        enabled={false}
        onValueChange={onValueChange}
      />,
    );

    expect(handlers().enabled).toBe(false);

    swipe(tree, -STEP);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(offset(tree)).toBe(-4 * STEP);
  });
});
