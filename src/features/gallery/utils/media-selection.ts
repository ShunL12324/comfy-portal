/**
 * Batch selection over a media grid, keyed by media URI. Shared by the Gallery
 * tab and History so both grids select, act and leave selection the same way.
 */
export interface MediaSelectionState {
  /** Selection mode: taps toggle instead of opening the viewer. */
  active: boolean;
  /** In the order they were picked. */
  selected: string[];
}

export type MediaSelectionEvent =
  /** Long-press on a tile (with its id) or an explicit Select (without). */
  | { type: 'begin'; id?: string }
  | { type: 'toggle'; id: string }
  | { type: 'selectAll'; ids: string[] }
  | { type: 'deselectAll' }
  | { type: 'end' }
  /** The grid changed under the selection: forget what is no longer in it. */
  | { type: 'retain'; ids: string[] };

export const EMPTY_SELECTION: MediaSelectionState = { active: false, selected: [] };

export function mediaSelectionReducer(state: MediaSelectionState, event: MediaSelectionEvent): MediaSelectionState {
  switch (event.type) {
    case 'begin':
      if (state.active) return event.id && !state.selected.includes(event.id) ? addTo(state, event.id) : state;
      return { active: true, selected: event.id ? [event.id] : [] };
    case 'toggle':
      // Outside selection mode a tap opens the viewer; it never selects.
      if (!state.active) return state;
      return state.selected.includes(event.id)
        ? { ...state, selected: state.selected.filter((id) => id !== event.id) }
        : addTo(state, event.id);
    case 'selectAll':
      return { active: true, selected: [...new Set(event.ids)] };
    case 'deselectAll':
      return state.selected.length ? { ...state, selected: [] } : state;
    case 'end':
      return state.active || state.selected.length ? EMPTY_SELECTION : state;
    case 'retain': {
      const present = new Set(event.ids);
      const selected = state.selected.filter((id) => present.has(id));
      if (selected.length === state.selected.length) return state;
      // Selection mode outlives its items only while there is something left to select.
      return { active: state.active && event.ids.length > 0, selected };
    }
  }
}

function addTo(state: MediaSelectionState, id: string): MediaSelectionState {
  return { ...state, selected: [...state.selected, id] };
}

/** Whether every item in `ids` is selected (and there is at least one). */
export function isAllSelected(selected: readonly string[], ids: readonly string[]): boolean {
  if (!ids.length || selected.length < ids.length) return false;
  const chosen = new Set(selected);
  return ids.every((id) => chosen.has(id));
}

export type BatchAction = 'save' | 'share' | 'delete';

/**
 * Which batch actions show, and which can run for this many items. Share is
 * shown only where a share sheet exists, and runs for exactly one item:
 * expo-sharing hands the system a single file, and sharing several needs a
 * native module this build does not include.
 */
export function getBatchActions({ count, canShare }: { count: number; canShare: boolean }) {
  const shown: BatchAction[] = canShare ? ['save', 'share', 'delete'] : ['save', 'delete'];
  const enabled = (action: BatchAction) => (action === 'share' ? count === 1 : count > 0);
  return shown.map((action) => ({ action, enabled: enabled(action) }));
}

/** "Saved 3 items to Photos", "Saved 2 of 3 items to Photos"; web says Downloaded. */
export function batchSaveSummary({ saved, total, web }: { saved: number; total: number; web: boolean }): string {
  const noun = total === 1 ? 'item' : 'items';
  const count = saved === total ? `${total} ${noun}` : `${saved} of ${total} ${noun}`;
  return web ? `Downloaded ${count}` : `Saved ${count} to Photos`;
}
