/**
 * What a filter switch costs on a gallery of a few hundred items: how many
 * tiles re-render, how many image views and video players are created, and
 * how long React spends committing it.
 */
import { createElement, Profiler, useEffect as mockUseEffect, useMemo as mockUseMemo } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { Gallery } from '@/features/gallery/components/gallery';
import { useMediaStore, type MediaAsset } from '@/features/gallery/stores/media-store';

const mockCounts = { tileRenders: 0, imageMounts: 0, players: 0 };

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/components/ui/design-system/primitives', () => ({
  Copy: () => null,
  Action: () => null,
  DesignColorProvider: ({ children }: any) => children ?? null,
  // Each media tile reads the palette once per render; nothing else on this screen does.
  useDesign: () => {
    mockCounts.tileRenders += 1;
    return { well: '#eee', media: '#000', onMedia: '#fff' };
  },
}));
jest.mock('@/components/self-ui/empty-state', () => ({ EmptyState: () => null }));
jest.mock('@/components/ui/design-system/filter-chips', () => ({ FilterChips: () => null }));
jest.mock('@/constants/icons', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-image', () => ({
  Image: () => {
    mockUseEffect(() => {
      mockCounts.imageMounts += 1;
    }, []);
    return null;
  },
}));
jest.mock('expo-video', () => ({
  useVideoPlayer: (uri: string) =>
    mockUseMemo(() => {
      mockCounts.players += 1;
      return { uri };
    }, [uri]),
  VideoView: () => null,
}));
// A warm still cache, as on every visit after the first.
jest.mock('@/features/gallery/services/video-thumbnails', () => ({
  peekVideoStill: (uri: string) => `${uri}.jpg`,
  subscribeVideoStills: () => () => {},
  requestVideoStill: async (uri: string) => `${uri}.jpg`,
}));
jest.mock('@/features/gallery/components/media-viewer', () => ({ MediaViewer: () => null }));
jest.mock('@/features/gallery/components/media-selection-app-bar', () => ({ MediaSelectionAppBar: () => null }));
jest.mock('@/features/gallery/components/empty-gallery-art', () => ({ EmptyGalleryArt: () => null }));
jest.mock('expo-haptics', () => ({ selectionAsync: async () => {} }));
jest.mock('@/services/image-storage', () => ({
  pruneMissingMedia: async () => {},
  deleteGeneratedMedia: async () => {},
}));

/** 400 synthetic entries, every third a video. */
const SEED = Array.from({ length: 400 }, (_, index): MediaAsset => {
  const kind = index % 3 === 2 ? 'video' : 'image';
  const id = `asset-${index}`;
  return {
    id,
    serverId: 'server-1',
    workflowId: 'binding-1',
    kind,
    path: `file:///media-v2/${id}.${kind === 'video' ? 'mp4' : 'png'}`,
    metadata: { timestamp: '2026-09-11T00:00:00Z', workflow: {} as any, originalUrl: '' },
  };
});

let renderer: ReactTestRenderer;
let commitTime = 0;

beforeAll(() => useMediaStore.persist.rehydrate());
beforeEach(() => {
  useMediaStore.setState({ assets: SEED });
  act(() => {
    renderer = create(
      createElement(
        Profiler,
        { id: 'gallery', onRender: (_id: string, _phase: string, actual: number) => (commitTime += actual) },
        createElement(Gallery),
      ),
    );
  });
  const laidOut = renderer.root.findAll((node) => typeof node.props?.onLayout === 'function', { deep: true });
  act(() => laidOut[0].props.onLayout({ nativeEvent: { layout: { width: 361, height: 700 } } }));
});
afterEach(() => {
  act(() => renderer.unmount());
});

function measure(action: () => void) {
  mockCounts.tileRenders = 0;
  mockCounts.imageMounts = 0;
  mockCounts.players = 0;
  commitTime = 0;
  act(() => {
    action();
  });
  return { ...mockCounts, commitMs: Math.round(commitTime * 10) / 10 };
}

const switchTo = (filter: string) =>
  measure(() =>
    renderer.root.find((node) => node.props?.label === 'Media type' && node.props?.onChange).props.onChange(filter),
  );

const tile = (index: number) =>
  renderer.root.findAll((node) => node.props?.selecting !== undefined && node.props?.uri, { deep: false })[index];

function prepend() {
  const cost = measure(() =>
    useMediaStore.getState().upsert({
      ...SEED[0],
      id: 'new',
      path: 'file:///media-v2/new.png',
      metadata: { ...SEED[0].metadata, timestamp: '2026-09-12T00:00:00Z' },
    }),
  );
  return cost;
}

test('video tiles show stills, never players', () => {
  expect(tile(2).props.kind).toBe('video');
  expect(mockCounts.players).toBe(0);
});

test('switching the filter keeps every mounted tile and creates no image views or players', () => {
  for (const filter of ['Videos', 'Images', 'All']) {
    const cost = switchTo(filter);
    expect(cost.imageMounts).toBe(0);
    expect(cost.players).toBe(0);
  }
});

test('a new item at the top shifts tiles without remounting them', () => {
  const cost = prepend();
  expect(tile(0).props.uri).toBe('file:///media-v2/new.png');
  expect(cost.imageMounts).toBe(0);
});

test('toggling one selection re-renders only that tile', () => {
  act(() => tile(0).props.onLongPress(tile(0).props.uri));
  expect(measure(() => tile(4).props.onPress(tile(4).props.uri)).tileRenders).toBe(1);
});

test('opening the viewer from a filtered grid opens on the tapped item', () => {
  switchTo('Videos');
  act(() => tile(3).props.onPress(tile(3).props.uri));
  const viewer = renderer.root.find((node) => node.props?.initialIndex !== undefined && node.props?.items);
  expect(viewer.props.visible).toBe(true);
  expect(viewer.props.items[viewer.props.initialIndex].uri).toBe(tile(3).props.uri);
  expect(viewer.props.items.every((item: { kind: string }) => item.kind === 'video')).toBe(true);
});

// GALLERY_BENCH=1 pnpm jest gallery-performance prints the numbers in the report.
(process.env.GALLERY_BENCH ? test : test.skip)('report', async () => {
  const rows = ['Videos', 'Images', 'All', 'Images', 'All'].map((filter) => ({ action: filter, ...switchTo(filter) }));
  rows.push({ action: 'prepend', ...prepend() });
  act(() => tile(0).props.onLongPress(tile(0).props.uri));
  rows.push({ action: 'toggle', ...measure(() => tile(4).props.onPress(tile(4).props.uri)) });
  console.table(rows);
});
