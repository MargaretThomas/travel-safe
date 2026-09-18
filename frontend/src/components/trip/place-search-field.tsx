import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { debounce } from '@/lib/debounce';
import { searchPlaces, type PlaceSuggestion } from '@/lib/map/geocoding';
import type { MapCoordinate } from '@/lib/map/map.types';
import { INITIAL_PLACE_SEARCH, reducePlaceSearch, shouldSearchPlaces } from '@/lib/map/place-search';

export type PlaceSearchFieldProps = {
  testID: string;
  label: string;
  placeholder: string;
  proximity?: MapCoordinate | null;
  actionLabel?: string;
  onAction?: () => void;
  onSelect: (place: PlaceSuggestion) => void;
  search?: typeof searchPlaces;
  debounceMs?: number;
};

export function PlaceSearchField({
  testID,
  label,
  placeholder,
  proximity,
  actionLabel,
  onAction,
  onSelect,
  search = searchPlaces,
  debounceMs = 300,
}: PlaceSearchFieldProps) {
  const [state, dispatch] = useReducer(reducePlaceSearch, INITIAL_PLACE_SEARCH);
  const queryRef = useRef(state.query);
  queryRef.current = state.query;

  const runSearch = useMemo(
    () =>
      debounce(() => {
        const query = queryRef.current;
        if (!shouldSearchPlaces(query)) return;
        void search(query, { proximity })
          .then((suggestions) => dispatch({ type: 'results', suggestions }))
          .catch(() => dispatch({ type: 'failed' }));
      }, debounceMs),
    [debounceMs, proximity, search],
  );

  useEffect(() => () => runSearch.cancel(), [runSearch]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {actionLabel && onAction ? (
          <Pressable
            testID={`${testID}-action`}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            hitSlop={8}>
            <ThemedText type="smallBold" themeColor="brandText">
              {actionLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        testID={testID}
        value={state.query}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        onChangeText={(query) => {
          queryRef.current = query;
          dispatch({ type: 'query', query });
          if (debounceMs <= 0) {
            if (!shouldSearchPlaces(query)) return;
            void search(query, { proximity })
              .then((suggestions) => dispatch({ type: 'results', suggestions }))
              .catch(() => dispatch({ type: 'failed' }));
            return;
          }
          runSearch.call();
        }}
        style={styles.input}
      />
      {state.open && state.suggestions.length > 0 ? (
        <ThemedView type="backgroundSelected" style={styles.dropdown} testID={`${testID.replace(/-input$/, '')}-dropdown`}>
          {state.suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.id}
              testID={`${testID.replace(/-input$/, '')}-suggestion-${index}`}
              accessibilityRole="button"
              onPress={() => {
                dispatch({ type: 'select', suggestion });
                onSelect(suggestion);
              }}
              style={styles.suggestion}>
              <ThemedText type="small">{suggestion.label}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#ffffff',
    fontSize: 16,
    minHeight: 44,
  },
  dropdown: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
});
