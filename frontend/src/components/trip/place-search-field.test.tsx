import { act, create } from 'react-test-renderer';

import { PlaceSearchField } from './place-search-field';

const PLACE = {
  id: 'woodstock',
  label: 'Woodstock, Cape Town',
  latitude: -33.927,
  longitude: 18.447,
};

function findByTestID(root: ReturnType<typeof create>, testID: string) {
  const match = root.root.findAll((node) => node.props.testID === testID);
  if (match.length === 0) throw new Error(`No testID "${testID}" found`);
  return match[0];
}

function invokeChangeText(root: ReturnType<typeof create>, testID: string, value: string) {
  const match = root.root.findAll(
    (node) => node.props.testID === testID && typeof node.props.onChangeText === 'function',
  );
  if (match.length === 0) throw new Error(`No onChangeText for "${testID}"`);
  match[0].props.onChangeText(value);
}

describe('PlaceSearchField', () => {
  it('shows suggestions after a search and selects one', async () => {
    const search = jest.fn().mockResolvedValue([PLACE]);
    const onSelect = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <PlaceSearchField
          testID="trip-destination-input"
          label="Destination"
          placeholder="Search"
          search={search}
          debounceMs={0}
          onSelect={onSelect}
        />,
      );
    });

    await act(async () => {
      invokeChangeText(renderer, 'trip-destination-input', 'wood');
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (search.mock.results[0]) {
        await search.mock.results[0].value;
      }
    });

    expect(search).toHaveBeenCalledWith('wood', expect.anything());
    expect(findByTestID(renderer, 'trip-destination-dropdown')).toBeTruthy();

    act(() => {
      findByTestID(renderer, 'trip-destination-suggestion-0').props.onPress();
    });
    expect(onSelect).toHaveBeenCalledWith(PLACE);
  });

  it('invokes the optional action control', () => {
    const onAction = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <PlaceSearchField
          testID="trip-origin-input"
          label="From"
          placeholder="Search"
          actionLabel="Use current location"
          onAction={onAction}
          search={jest.fn()}
          onSelect={jest.fn()}
        />,
      );
    });
    act(() => {
      findByTestID(renderer, 'trip-origin-input-action').props.onPress();
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
