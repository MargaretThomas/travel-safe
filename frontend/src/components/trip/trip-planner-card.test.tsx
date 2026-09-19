import { act, create } from 'react-test-renderer';

import { TripPlannerCard } from './trip-planner-card';

function findByTestID(root: ReturnType<typeof create>, testID: string) {
  const match = root.root.findAllByProps({ testID });
  if (match.length === 0) throw new Error(`No testID "${testID}" found`);
  return match[0];
}

describe('TripPlannerCard', () => {
  it('renders origin, destination and current-location action', () => {
    const onUseCurrentLocation = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <TripPlannerCard
          canUseCurrentLocation
          statusMessage="Planning route…"
          onSelectOrigin={jest.fn()}
          onSelectDestination={jest.fn()}
          onUseCurrentLocation={onUseCurrentLocation}
        />,
      );
    });
    expect(findByTestID(renderer, 'trip-plan-card')).toBeTruthy();
    expect(findByTestID(renderer, 'trip-origin-input')).toBeTruthy();
    expect(findByTestID(renderer, 'trip-destination-input')).toBeTruthy();
    expect(findByTestID(renderer, 'trip-plan-status')).toBeTruthy();
    act(() => {
      findByTestID(renderer, 'trip-origin-input-action').props.onPress();
    });
    expect(onUseCurrentLocation).toHaveBeenCalledTimes(1);
  });

  it('hides the current-location action when GPS is unavailable', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <TripPlannerCard
          canUseCurrentLocation={false}
          onSelectOrigin={jest.fn()}
          onSelectDestination={jest.fn()}
          onUseCurrentLocation={jest.fn()}
        />,
      );
    });
    expect(() => findByTestID(renderer, 'trip-origin-input-action')).toThrow();
  });
});
