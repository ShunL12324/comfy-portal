import { useCallback, useRef } from 'react';
import type { FlatList, View } from 'react-native';

import type { MediaViewerItem } from '../components/media-viewer';
import { isRectVisible, measureInWindow, type Rect } from '../components/media-viewer/transition-geometry';

/**
 * Tracks where a media grid's tiles are on screen, so the viewer can grow out
 * of the tapped tile and shrink back into the tile of whatever it shows on
 * close. Give `listRef` to the grid's FlatList and `registerTile` to each
 * `MediaTile`, then pass `getOriginRect` to `MediaViewer`.
 */
export function useMediaTileRects<T>() {
  const listRef = useRef<FlatList<T>>(null);
  const tiles = useRef(new Map<string, View>());

  const registerTile = useCallback((uri: string, view: View | null) => {
    if (view) tiles.current.set(uri, view);
    else tiles.current.delete(uri);
  }, []);

  /**
   * The tile's frame in window coordinates, or nothing when it is not mostly
   * on screen: recycled, scrolled out of the list, filtered or deleted.
   */
  const getOriginRect = useCallback(async (item: MediaViewerItem): Promise<Rect | undefined> => {
    const tile = tiles.current.get(item.uri);
    const list = listRef.current?.getNativeScrollRef();
    // The native scroll view is a host view at runtime, though its type is the class component's.
    if (!tile || !list || !('measureInWindow' in list)) return undefined;
    const [rect, viewport] = await Promise.all([measureInWindow(tile), measureInWindow(list)]);
    return rect && viewport && isRectVisible(rect, viewport) ? rect : undefined;
  }, []);

  return { listRef, registerTile, getOriginRect };
}
