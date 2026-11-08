import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { IntervalPicker } from './interval-picker';
import { DAY_MINUTES, HOUR_MINUTES, INTERVAL_PRESETS, INTERVAL_PRESET_MINUTES } from '@/lib/intervals';

jest.mock('@/components/ui/base/ruler', () => {
  const ReactModule = require('react');
  return {
    Ruler: (props: Record<string, unknown>) =>
      ReactModule.createElement('Ruler', props),
  };
});

function render(element: React.ReactElement): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(element);
  });
  if (!tree) throw new Error('The picker did not render.');
  return tree;
}

function ruler(tree: ReactTestRenderer): ReactTestInstance {
  const [match] = tree.root.findAll((node) => (node.type as string) === 'Ruler');
  if (!match) throw new Error('The picker did not render the ruler.');
  return match;
}

function byTestID(tree: ReactTestRenderer, testID: string): ReactTestInstance {
  const [match] = tree.root.findAll(
    (node) => typeof node.type === 'string' && node.props.testID === testID,
  );
  if (!match) throw new Error(`No element with testID "${testID}".`);
  return match;
}

function textOf(node: { props: { children?: unknown } }): string {
  if (typeof node.props.children === 'string') return node.props.children;
  if (Array.isArray(node.props.children)) {
    return node.props.children
      .map((child) =>
        typeof child === 'string'
          ? child
          : textOf(child as { props: { children?: unknown } }),
      )
      .join('');
  }
  return '';
}

function press(tree: ReactTestRenderer, testID: string): void {
  const [pressable] = tree.root.findAll(
    (node) =>
      typeof node.type !== 'string' &&
      node.props.testID === testID &&
      typeof node.props.onPress === 'function',
  );
  if (!pressable) throw new Error(`No pressable with testID "${testID}".`);
  // A disabled pressable never delivers its press, the same way the platform does it.
  if (pressable.props.disabled) return;
  act(() => {
    pressable.props.onPress();
  });
}

describe('IntervalPicker', () => {
  it('offers the ruler every interval it can select', () => {
    const tree = render(<IntervalPicker value={7 * DAY_MINUTES} onChange={() => {}} />);

    expect(ruler(tree).props.values).toEqual(INTERVAL_PRESET_MINUTES);
    expect(INTERVAL_PRESET_MINUTES).toEqual([
      HOUR_MINUTES,
      DAY_MINUTES,
      2 * DAY_MINUTES,
      3 * DAY_MINUTES,
      7 * DAY_MINUTES,
      14 * DAY_MINUTES,
      30 * DAY_MINUTES,
      60 * DAY_MINUTES,
      90 * DAY_MINUTES,
      180 * DAY_MINUTES,
      365 * DAY_MINUTES,
    ]);
  });

  it('shows the selected interval', () => {
    const tree = render(<IntervalPicker value={7 * DAY_MINUTES} onChange={() => {}} />);

    expect(textOf(byTestID(tree, 'interval-selected-label'))).toBe('1 week');
  });

  it('puts the selected interval under the centre of the ruler', () => {
    const tree = render(<IntervalPicker value={90 * DAY_MINUTES} onChange={() => {}} />);

    expect(ruler(tree).props.value).toBe(90 * DAY_MINUTES);
  });

  it('reports the interval the ruler settles on', () => {
    const onChange = jest.fn();
    const tree = render(<IntervalPicker value={7 * DAY_MINUTES} onChange={onChange} />);

    act(() => {
      ruler(tree).props.onValueChange(30 * DAY_MINUTES);
    });

    expect(onChange).toHaveBeenCalledWith(30 * DAY_MINUTES);
  });

  it('reports the interval a preset is tapped', () => {
    const onChange = jest.fn();
    const tree = render(<IntervalPicker value={7 * DAY_MINUTES} onChange={onChange} />);

    press(tree, 'interval-3d');

    expect(onChange).toHaveBeenCalledWith(3 * DAY_MINUTES);
  });

  it('marks the selected preset as selected', () => {
    const tree = render(<IntervalPicker value={7 * DAY_MINUTES} onChange={() => {}} />);

    expect(byTestID(tree, 'interval-1w').props.accessibilityState.selected).toBe(true);
    expect(byTestID(tree, 'interval-3d').props.accessibilityState.selected).toBe(false);
  });

  it('snaps an interval that is not a preset to the nearest one', () => {
    const onChange = jest.fn();
    const tree = render(<IntervalPicker value={5 * DAY_MINUTES} onChange={onChange} />);

    expect(textOf(byTestID(tree, 'interval-selected-label'))).toBe('3 days');
    expect(onChange).toHaveBeenCalledWith(3 * DAY_MINUTES);
  });

  it('does not report an interval that is already a preset', () => {
    const onChange = jest.fn();
    render(<IntervalPicker value={7 * DAY_MINUTES} onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('gives every preset a test identifier for the end to end flow', () => {
    const tree = render(<IntervalPicker value={7 * DAY_MINUTES} onChange={() => {}} />);

    INTERVAL_PRESETS.forEach(({ key }) => {
      expect(byTestID(tree, `interval-${key}`)).toBeTruthy();
    });
  });

  it('does not let a disabled picker change the interval', () => {
    const onChange = jest.fn();
    const tree = render(
      <IntervalPicker value={7 * DAY_MINUTES} onChange={onChange} disabled />,
    );

    press(tree, 'interval-3d');

    expect(onChange).not.toHaveBeenCalled();
    expect(byTestID(tree, 'interval-3d').props.accessibilityState.disabled).toBe(true);
    expect(ruler(tree).props.enabled).toBe(false);
  });
});
