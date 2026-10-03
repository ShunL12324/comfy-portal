/**
 * The Run page's result list while a run's outputs arrive one by one.
 *
 * One run owns the list at a time, identified by `resultsKey`. A run takes it
 * over when its outputs are found, so the pages fill in place: `pendingResults`
 * placeholder pages follow the saved media and turn into media as saves land.
 * Updates from a run that no longer owns the list are dropped; its outputs are
 * still in the gallery.
 */
export interface RunResults {
  /** The run whose outputs are listed; changes only when another run takes over. */
  resultsKey: string;
  /** Saved outputs, in history order. */
  generatedMedia: string[];
  /** Outputs still downloading, shown as placeholder pages after the media. */
  pendingResults: number;
}

/** A finalize pass for `runKey` is about to download `count` outputs. */
export function resultsFound(state: RunResults, runKey: string, count: number): RunResults {
  if (state.resultsKey === runKey) return { ...state, pendingResults: count };
  // An empty pass (everything was already saved) keeps the previous results up.
  if (count <= 0) return state;
  return { resultsKey: runKey, generatedMedia: [], pendingResults: count };
}

/** One of `runKey`'s outputs was saved. */
export function resultSaved(state: RunResults, runKey: string, uri: string): RunResults {
  if (state.resultsKey !== runKey) return state;
  return {
    ...state,
    generatedMedia: [...state.generatedMedia, uri],
    pendingResults: Math.max(0, state.pendingResults - 1),
  };
}

/** `runKey` is done saving: placeholders left over from failed downloads go. */
export function resultsSettled(state: RunResults, runKey: string): RunResults {
  if (state.resultsKey !== runKey || state.pendingResults === 0) return state;
  return { ...state, pendingResults: 0 };
}

export type ResultPage = { kind: 'media'; uri: string } | { kind: 'pending' };

/** Saved media, then one placeholder page per output still downloading. */
export function resultPages(media: string[], pending: number): ResultPage[] {
  return [
    ...media.map((uri): ResultPage => ({ kind: 'media', uri })),
    ...Array.from({ length: Math.max(0, pending) }, (): ResultPage => ({ kind: 'pending' })),
  ];
}

export interface PagerPosition {
  resultsKey: string;
  index: number;
}

/**
 * Where the pager stands after the result list changed. A new run starts at
 * the first page; within a run the user's page is kept, and only pulled back
 * when the list shrank under it (a failed download's placeholder removed, or a
 * result deleted).
 */
export function followPage(position: PagerPosition, resultsKey: string, pageCount: number): PagerPosition {
  if (position.resultsKey !== resultsKey) return { resultsKey, index: 0 };
  const index = Math.max(0, Math.min(position.index, pageCount - 1));
  return index === position.index ? position : { resultsKey, index };
}

/**
 * The pager moved to `index`. Returns the same object when nothing changed, so
 * a caller that reports its current page on every render (the media viewer's
 * index effect) settles instead of looping.
 */
export function movePage(position: PagerPosition, resultsKey: string, index: number): PagerPosition {
  return position.resultsKey === resultsKey && position.index === index ? position : { resultsKey, index };
}
