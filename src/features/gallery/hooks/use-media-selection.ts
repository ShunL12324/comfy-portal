import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { Platform } from 'react-native';

import { EMPTY_SELECTION, isAllSelected, mediaSelectionReducer } from '../utils/media-selection';

/** Selection mode for a media grid whose items are identified by `ids` (their URIs). */
export function useMediaSelection(ids: string[]) {
  const [state, dispatch] = useReducer(mediaSelectionReducer, EMPTY_SELECTION);

  // Deleted or filtered-out items leave the selection with the grid.
  useEffect(() => {
    dispatch({ type: 'retain', ids });
  }, [ids]);

  const begin = useCallback((id?: string) => {
    // A tick confirms the long-press took; web has nothing to tick.
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    dispatch({ type: 'begin', id });
  }, []);
  const toggle = useCallback((id: string) => dispatch({ type: 'toggle', id }), []);
  const end = useCallback(() => dispatch({ type: 'end' }), []);
  const allSelected = isAllSelected(state.selected, ids);
  const toggleAll = useCallback(
    () => dispatch(allSelected ? { type: 'deselectAll' } : { type: 'selectAll', ids }),
    [allSelected, ids],
  );
  const selectedSet = useMemo(() => new Set(state.selected), [state.selected]);
  // Stable between selection changes, so a grid's renderItem can depend on it.
  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  return {
    active: state.active,
    selected: state.selected,
    isSelected,
    allSelected,
    begin,
    toggle,
    toggleAll,
    end,
  };
}

export type MediaSelection = ReturnType<typeof useMediaSelection>;
