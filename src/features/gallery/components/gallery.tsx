import { FilterChips } from '@/components/ui/design-system/filter-chips';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { deleteGeneratedMedia, pruneMissingMedia } from '@/services/image-storage';
import { useMediaStore } from '../stores/media-store';
import { useMediaSelection } from '../hooks/use-media-selection';
import { useMediaTileRects } from '../hooks/use-media-tile-rects';
import { EmptyState } from '@/components/self-ui/empty-state';
import { EmptyGalleryArt } from './empty-gallery-art';
import { MediaSelectionAppBar } from './media-selection-app-bar';
import { MediaTile } from './media-tile';
import { MediaViewer, type MediaViewerItem } from './media-viewer';
import { designTokens as t } from '@/constants/design-tokens';

const deleteOne = (item: MediaViewerItem) => deleteGeneratedMedia([item.uri]);
const positionKey = (_: unknown, index: number) => String(index);

/**
 * One media collection, optionally scoped to a server, under its own app bar.
 * No date groups or duplicated storage. Long-press a tile to select several.
 */
export function Gallery({ serverId, title = 'Gallery' }: { serverId?: string; title?: string }) {
  const all = useMediaStore((state) => state.assets);
  // Entries whose file was deleted elsewhere would otherwise show as blank tiles.
  useEffect(() => {
    void pruneMissingMedia();
  }, []);
  const [filter, setFilter] = useState('All');
  // Unset until measured. Starting from a guessed width drew one frame of
  // wrongly sized tiles that visibly jumped once onLayout arrived; an empty
  // frame is quieter than a wrong one.
  const [width, setWidth] = useState<number>();
  // The viewer opens on an item, not an index, so the tiles' press handler does
  // not depend on the filtered list and survives a filter switch.
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const assets = useMemo(
    () =>
      all.filter(
        (asset) =>
          (!serverId || asset.serverId === serverId) &&
          (filter === 'All' || asset.kind === (filter === 'Images' ? 'image' : 'video')),
      ),
    [all, filter, serverId],
  );
  const viewerItems = useMemo<MediaViewerItem[]>(
    () => assets.map((asset) => ({ uri: asset.path, kind: asset.kind })),
    [assets],
  );
  const ids = useMemo(() => assets.map((asset) => asset.path), [assets]);
  const selection = useMediaSelection(ids);
  const { listRef: gridRef, registerTile, getOriginRect } = useMediaTileRects<(typeof assets)[number]>();
  const { active: selecting, toggle, begin } = selection;
  const closePreview = useCallback(() => setPreviewUri(null), []);
  const openOrToggle = useCallback(
    (uri: string) => {
      if (selecting) toggle(uri);
      else setPreviewUri(uri);
    },
    [selecting, toggle],
  );
  const deleteMany = useCallback((uris: string[]) => deleteGeneratedMedia(uris), []);
  const hasMedia = all.some((asset) => !serverId || asset.serverId === serverId);
  const columns = width !== undefined && width >= 480 ? 4 : 3;
  const size = width === undefined ? 0 : (width - (columns - 1) * t.layout.label) / columns;
  // Square tiles with a 4-point gap, so a row's pitch is exact.
  const rowPitch = size + t.layout.label;
  const noun = filter === 'All' ? 'media' : filter.toLowerCase();
  const { isSelected } = selection;
  const renderItem = useCallback(
    ({ item }: { item: (typeof assets)[number] }) => (
      <MediaTile
        uri={item.path}
        kind={item.kind}
        size={size}
        selecting={selecting}
        selected={isSelected(item.path)}
        onPress={openOrToggle}
        onLongPress={begin}
        onTileRef={registerTile}
      />
    ),
    [size, selecting, isSelected, openOrToggle, begin, registerTile],
  );
  return (
    <View style={{ flex: 1 }}>
      <MediaSelectionAppBar title={title} selection={selection} onDelete={deleteMany} />
      <View style={{ flex: 1, paddingHorizontal: t.layout.gutter }}>
        <View style={{ flex: 1, gap: t.layout.field }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {hasMedia && (
            <FilterChips
              label="Media type"
              value={filter}
              onChange={setFilter}
              options={['All', 'Images', 'Videos'].map((value) => ({ value, label: value }))}
            />
          )}
          {width !== undefined && (
            <FlatList
              ref={gridRef}
              key={columns}
              data={assets}
              numColumns={columns}
              /**
               * Keyed by position, not by asset. With several columns FlatList keys
               * each row by its items' keys joined, so keying by id made almost
               * every row key change on a filter switch (or a new item at the top)
               * and remounted every visible tile with its native views. By
               * position, rows and tiles stay mounted and only their props change.
               */
              keyExtractor={positionKey}
              columnWrapperStyle={{ gap: t.layout.label }}
              contentContainerStyle={{ flexGrow: 1, gap: t.layout.label, paddingBottom: t.layout.gutter }}
              /**
               * Bounded so the number of mounted tiles stays proportional to what is
               * on screen. At the default windowSize of 21 the list keeps ten
               * viewports of tiles mounted either side of the visible one — roughly
               * 380 tiles on a phone at three columns — and since the pool became
               * global this list is the user's whole history rather than one
               * workflow's output. Five viewports' worth is enough to scroll
               * smoothly. Video tiles show cached stills, not players (see
               * `useVideoStill`), so a tile costs one image view either way.
               *
               * `removeClippedSubviews` is deliberately not set: it has a history of
               * blanking cells on iOS.
               */
              windowSize={5}
              initialNumToRender={columns * 8}
              maxToRenderPerBatch={columns * 4}
              getItemLayout={(_, index) => ({
                length: rowPitch,
                offset: rowPitch * Math.floor(index / columns),
                index,
              })}
              extraData={selection.selected}
              // An empty collection gets the centred illustration, at the same height as every
              // other tab's. A filter with no matches is not that moment: the chips stay, with a note.
              ListEmptyComponent={
                hasMedia ? (
                  <EmptyState title={`No ${noun} yet`}>Try another media type.</EmptyState>
                ) : (
                  // This grid holds images and videos; the copy has to cover both.
                  <EmptyState align="center" art={<EmptyGalleryArt />} title="No media yet">
                    Your generated images and videos will appear here.
                  </EmptyState>
                )
              }
              renderItem={renderItem}
            />
          )}
        </View>
      </View>
      <MediaViewer
        items={viewerItems}
        initialIndex={previewUri === null ? 0 : Math.max(ids.indexOf(previewUri), 0)}
        visible={previewUri !== null}
        onClose={closePreview}
        getOriginRect={getOriginRect}
        onDelete={deleteOne}
      />
    </View>
  );
}
