/**
 * The grid holds images and videos, and it must not draw before it is measured.
 */
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Text primitives return their children joined. They deliberately avoid
// `createElement`: NativeWind's Babel transform rewrites those against a
// module-scope helper that Jest's mock hoisting rejects.
jest.mock('@/components/ui/design-system/primitives', () => ({
  Copy: ({ children }: any) =>
    ([] as any[])
      .concat(children)
      .filter((child) => child !== null && child !== undefined && child !== false)
      .join(''),
  Action: () => null,
  DesignColorProvider: ({ children }: any) => children ?? null,
  useDesign: () => ({ paper: '#fff', well: '#eee', raised: '#ddd', muted: '#999', ink: '#000' }),
}));
jest.mock('@/components/ui/design-system/filter-chips', () => ({ FilterChips: () => null }));
jest.mock('@/constants/icons', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({}), VideoView: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/features/gallery/components/media-viewer', () => ({ MediaViewer: () => null }));
jest.mock('@/features/gallery/components/empty-gallery-art', () => ({ EmptyGalleryArt: () => null }));
jest.mock('@/services/image-storage', () => ({ pruneMissingMedia: async () => {} }));

import { Gallery } from '@/features/gallery/components/gallery';
import { useMediaStore, type MediaAsset } from '@/features/gallery/stores/media-store';

const asset = (id: string, kind: MediaAsset['kind']): MediaAsset => ({
  id,
  serverId: 'server-1',
  workflowId: 'binding-1',
  kind,
  path: `file:///media-v2/${id}.${kind === 'video' ? 'mp4' : 'png'}`,
  metadata: { timestamp: '2026-09-11T00:00:00Z', workflow: {} as any, originalUrl: '' },
});

function texts(renderer: ReactTestRenderer): string[] {
  const found: string[] = [];
  const walk = (node: any) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') return void found.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    walk(node.children);
  };
  walk(renderer.toJSON());
  return found;
}

/**
 * Tiles, read off the rendered output rather than the element tree: a Pressable
 * appears several times up the tree carrying the same accessibility props.
 */
function tiles(renderer: ReactTestRenderer): any[] {
  const found: any[] = [];
  const walk = (node: any) => {
    if (node === null || node === undefined || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.props?.accessibilityRole === 'button') found.push(node);
    walk(node.children);
  };
  walk(renderer.toJSON());
  return found;
}

/** The flattened width a tile was laid out at. */
function tileWidth(tile: any): number {
  return ([] as any[]).concat(tile.props.style).find((entry) => entry && entry.width !== undefined).width;
}

function measure(renderer: ReactTestRenderer, width: number) {
  const laidOut = renderer.root.findAll((node) => typeof node.props?.onLayout === 'function', { deep: true });
  act(() => laidOut[0].props.onLayout({ nativeEvent: { layout: { width, height: 800 } } }));
}

let renderer: ReactTestRenderer;

beforeEach(async () => {
  await useMediaStore.persist.rehydrate();
  useMediaStore.setState({ assets: [] });
});
afterEach(() => act(() => renderer?.unmount()));

async function render(props: { serverId?: string } = {}) {
  await act(async () => {
    renderer = create(createElement(Gallery, props));
  });
}

test('the empty state names both kinds of media it holds', async () => {
  await render();
  measure(renderer, 353);

  const shown = texts(renderer);
  // It used to say "No images yet" while also holding videos.
  expect(shown).toContain('No media yet');
  expect(shown).toContain('Your generated images and videos will appear here.');
});

test('nothing is drawn until the grid has been measured', async () => {
  useMediaStore.setState({ assets: [asset('a', 'image'), asset('b', 'video')] });
  await render();

  // Previously a hardcoded 353 drew a first frame of wrongly sized tiles that
  // jumped as soon as onLayout arrived.
  expect(tiles(renderer)).toHaveLength(0);

  measure(renderer, 353);
  expect(tiles(renderer)).toHaveLength(2);
});

test('tiles divide the measured width, not a guessed one', async () => {
  useMediaStore.setState({ assets: [asset('a', 'image')] });
  await render();
  measure(renderer, 320);

  // Three columns with two 4-point gaps: (320 - 8) / 3.
  expect(tileWidth(tiles(renderer)[0])).toBeCloseTo((320 - 8) / 3);
});

test('a wide container uses four columns', async () => {
  useMediaStore.setState({ assets: [asset('a', 'image')] });
  await render();
  measure(renderer, 600);

  expect(tileWidth(tiles(renderer)[0])).toBeCloseTo((600 - 12) / 4);
});

test('scoping to a server still shows only that server, and assets outlive nothing else', async () => {
  useMediaStore.setState({
    assets: [asset('a', 'image'), { ...asset('b', 'image'), serverId: 'other-server' }],
  });
  await render({ serverId: 'server-1' });
  measure(renderer, 353);

  expect(tiles(renderer)).toHaveLength(1);
});
