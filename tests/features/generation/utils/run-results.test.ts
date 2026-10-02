import {
  followPage,
  resultPages,
  resultSaved,
  resultsFound,
  resultsSettled,
  type RunResults,
} from '@/features/generation/utils/run-results';

const EMPTY: RunResults = { resultsKey: '', generatedMedia: [], pendingResults: 0 };

test('a run takes the list over when its outputs are found, then fills it in history order', () => {
  const previous: RunResults = { resultsKey: 'old', generatedMedia: ['file:///old.png'], pendingResults: 0 };
  let state = resultsFound(previous, 'run', 3);
  expect(state).toEqual({ resultsKey: 'run', generatedMedia: [], pendingResults: 3 });

  state = resultSaved(state, 'run', 'file:///a.png');
  expect(state).toEqual({ resultsKey: 'run', generatedMedia: ['file:///a.png'], pendingResults: 2 });
  state = resultSaved(state, 'run', 'file:///b.png');
  state = resultSaved(state, 'run', 'file:///c.png');
  expect(state).toEqual({
    resultsKey: 'run',
    generatedMedia: ['file:///a.png', 'file:///b.png', 'file:///c.png'],
    pendingResults: 0,
  });
});

test('a pass with nothing to fetch leaves the previous results up', () => {
  const previous: RunResults = { resultsKey: 'old', generatedMedia: ['file:///old.png'], pendingResults: 0 };
  expect(resultsFound(previous, 'run', 0)).toBe(previous);
});

test('a later pass of the same run keeps what earlier passes showed', () => {
  let state = resultSaved(resultsFound(EMPTY, 'run', 3), 'run', 'file:///a.png');
  state = resultsSettled(state, 'run');
  // Reconciliation retries the two that failed.
  state = resultsFound(state, 'run', 2);
  expect(state).toEqual({ resultsKey: 'run', generatedMedia: ['file:///a.png'], pendingResults: 2 });
});

test('a failed download mid-batch keeps the results that arrived and drops its placeholder at the end', () => {
  // Three outputs: the second fails, so the first and third are saved.
  let state = resultsFound(EMPTY, 'run', 3);
  state = resultSaved(state, 'run', 'file:///a.png');
  state = resultSaved(state, 'run', 'file:///c.png');
  expect(state.pendingResults).toBe(1);
  state = resultsSettled(state, 'run');
  expect(state).toEqual({ resultsKey: 'run', generatedMedia: ['file:///a.png', 'file:///c.png'], pendingResults: 0 });
});

test('updates from a run that lost the list are dropped', () => {
  let state = resultsFound(EMPTY, 'first', 2);
  state = resultsFound(state, 'second', 1);
  const owned = state;
  expect(resultSaved(state, 'first', 'file:///late.png')).toBe(owned);
  expect(resultsSettled(state, 'first')).toBe(owned);
  state = resultSaved(state, 'second', 'file:///b.png');
  expect(state.generatedMedia).toEqual(['file:///b.png']);
});

test('pages are the saved media followed by one placeholder per pending output', () => {
  expect(resultPages(['file:///a.png'], 2)).toEqual([
    { kind: 'media', uri: 'file:///a.png' },
    { kind: 'pending' },
    { kind: 'pending' },
  ]);
  expect(resultPages([], 0)).toEqual([]);
});

test('the page count holds while results arrive, so the pager is never rebuilt mid-run', () => {
  let state = resultsFound(EMPTY, 'run', 3);
  const counts: number[] = [];
  for (const uri of ['file:///a.png', 'file:///b.png', 'file:///c.png']) {
    state = resultSaved(state, 'run', uri);
    counts.push(resultPages(state.generatedMedia, state.pendingResults).length);
  }
  expect(counts).toEqual([3, 3, 3]);
});

test('the current page stays put while results arrive', () => {
  let state = resultSaved(resultsFound(EMPTY, 'run', 3), 'run', 'file:///a.png');
  // The user swipes to the third page, still a placeholder.
  let position = { resultsKey: 'run', index: 2 };
  for (const uri of ['file:///b.png', 'file:///c.png']) {
    state = resultSaved(state, 'run', uri);
    const next = followPage(position, state.resultsKey, resultPages(state.generatedMedia, state.pendingResults).length);
    expect(next).toBe(position);
    position = next;
  }
});

test('the page is pulled back only when the list shrinks under it', () => {
  // The user waits on the last placeholder, whose download then fails.
  let state = resultSaved(resultsFound(EMPTY, 'run', 2), 'run', 'file:///a.png');
  state = resultsSettled(state, 'run');
  const position = followPage({ resultsKey: 'run', index: 1 }, state.resultsKey, 1);
  expect(position).toEqual({ resultsKey: 'run', index: 0 });
});

test('a new run starts on its first page', () => {
  expect(followPage({ resultsKey: 'old', index: 3 }, 'run', 4)).toEqual({ resultsKey: 'run', index: 0 });
});
