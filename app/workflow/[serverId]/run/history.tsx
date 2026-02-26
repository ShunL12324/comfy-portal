import { AppBar } from '@/components/layout/app-bar';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Modal, ModalBackdrop, ModalBody, ModalContent } from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { ZoomableMedia } from '@/features/generation/components/media-preview/zoomable-media';
import { MediaActions } from '@/features/generation/components/media-preview/media-actions';
import { loadHistoryMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { Download, Share, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { HistoryItem } from '@/features/generation/components/history-drawer/history-item';

const NUM_COLUMNS = 3;
const GRID_GAP = 4;
const HORIZONTAL_PADDING = 16;

const listContentStyle = {
  paddingHorizontal: HORIZONTAL_PADDING - GRID_GAP / 2,
  paddingBottom: 40,
};

export default function HistoryGalleryPage() {
  const { serverId, workflowId } = useLocalSearchParams<{ serverId: string; workflowId: string }>();
  const insets = useSafeAreaInsets();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showMediaActions, setShowMediaActions] = useState(false);

  // Stable callback refs to avoid re-renders
  const onItemPressRef = useRef<(url: string) => void>(() => {});
  const onItemLongPressRef = useRef<(url: string) => void>(() => {});

  onItemPressRef.current = (url: string) => {
    if (isSelectionMode) {
      setSelectedMedia((prev) => {
        const next = new Set(prev);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        if (next.size === 0) setIsSelectionMode(false);
        return next;
      });
    } else {
      // Open fullscreen preview
      setPreviewUrl(url);
    }
  };

  onItemLongPressRef.current = (url: string) => {
    setIsSelectionMode(true);
    setSelectedMedia(new Set([url]));
  };

  // Load data on mount
  useEffect(() => {
    if (serverId && workflowId) {
      loadHistoryMedia(serverId, workflowId).then(setMediaItems);
    }
  }, [serverId, workflowId]);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMedia(new Set());
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!workflowId || selectedMedia.size === 0) return;
    try {
      for (const url of selectedMedia) {
        try { new File(url).delete(); } catch { /* ignore */ }
        try { new File(`${url}.json`).delete(); } catch { /* ignore */ }
      }
      const updatedMedia = await loadHistoryMedia(serverId, workflowId);
      setMediaItems(updatedMedia);
      setSelectedMedia(new Set());
      setIsSelectionMode(false);
      setIsDeleteAlertOpen(false);
    } catch {
      showToast.error('Delete Failed', 'Failed to delete media', insets.top + 8);
    }
  }, [selectedMedia, serverId, workflowId, insets.top]);

  const handleShare = useCallback(async () => {
    if (selectedMedia.size === 0) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast.error('Not available', 'Sharing is not supported on this device', insets.top + 8);
        return;
      }
      await Sharing.shareAsync(selectedMedia.values().next().value!);
    } catch { /* ignore */ }
  }, [insets.top, selectedMedia]);

  const handleSave = useCallback(async () => {
    if (selectedMedia.size === 0) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('Permission required', 'Please allow access to save media', insets.top + 8);
      return;
    }
    let savedCount = 0;
    try {
      for (const url of selectedMedia) {
        await MediaLibrary.saveToLibraryAsync(url);
        savedCount++;
      }
      showToast.success('Saved', `Saved ${savedCount} item${savedCount > 1 ? 's' : ''} to Photos`, insets.top + 8);
      setIsSelectionMode(false);
      setSelectedMedia(new Set());
    } catch {
      showToast.error('Save Failed', 'Failed to save some media', insets.top + 8);
    }
  }, [insets.top, selectedMedia]);

  const renderItem = useCallback(
    ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
      <View style={{ flex: 1, padding: GRID_GAP / 2 }}>
        <HistoryItem
          url={item.url}
          index={index}
          isSelectionMode={isSelectionMode}
          isSelected={selectedMedia.has(item.url)}
          onPress={onItemPressRef.current}
          onLongPress={onItemLongPressRef.current}
        />
      </View>
    ),
    [isSelectionMode, selectedMedia],
  );

  const hasSelection = selectedMedia.size > 0;

  const rightElement = useMemo(() => {
    return (
      <HStack className="items-center" space="xs">
        <Button
          variant="link"
          className="h-9 w-9 rounded-xl p-0"
          onPress={handleShare}
          disabled={!isSelectionMode || !hasSelection}
          style={{ opacity: isSelectionMode && hasSelection ? 1 : isSelectionMode ? 0.3 : 0 }}
          pointerEvents={isSelectionMode ? 'auto' : 'none'}
        >
          <Icon as={Share} size="md" className="text-primary-500" />
        </Button>
        <Button
          variant="link"
          className="h-9 w-9 rounded-xl p-0"
          onPress={handleSave}
          disabled={!isSelectionMode || !hasSelection}
          style={{ opacity: isSelectionMode && hasSelection ? 1 : isSelectionMode ? 0.3 : 0 }}
          pointerEvents={isSelectionMode ? 'auto' : 'none'}
        >
          <Icon as={Download} size="md" className="text-primary-500" />
        </Button>
        <Button
          variant="link"
          className="h-9 w-9 rounded-xl p-0"
          onPress={() => setIsDeleteAlertOpen(true)}
          disabled={!isSelectionMode || !hasSelection}
          style={{ opacity: isSelectionMode && hasSelection ? 1 : isSelectionMode ? 0.3 : 0 }}
          pointerEvents={isSelectionMode ? 'auto' : 'none'}
        >
          <Icon as={Trash2} size="md" className="text-error-500" />
        </Button>
        {isSelectionMode ? (
          <Button
            variant="solid"
            size="xs"
            onPress={exitSelectionMode}
            className="ml-1 rounded-lg bg-primary-500"
            style={{ width: 60 }}
          >
            <ButtonText className="text-xs font-semibold">Done</ButtonText>
          </Button>
        ) : (
          <Button
            variant="solid"
            size="xs"
            onPress={() => setIsSelectionMode(true)}
            className="ml-1 rounded-lg bg-background-100"
            style={{ width: 60, borderWidth: 1, borderColor: 'transparent' }}
          >
            <ButtonText className="text-xs font-medium text-primary-400">Select</ButtonText>
          </Button>
        )}
      </HStack>
    );
  }, [isSelectionMode, hasSelection, handleShare, handleSave, exitSelectionMode]);

  return (
    <View className="flex-1 bg-background-0">
      <AppBar
        title={isSelectionMode ? `${selectedMedia.size} selected` : 'History'}
        titleSize="sm"
        rightElement={rightElement}
      />

      {/* Grid */}
      <FlatList
        data={mediaItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        removeClippedSubviews
        contentContainerStyle={listContentStyle}
        initialNumToRender={12}
        maxToRenderPerBatch={9}
        windowSize={5}
      />

      {/* Fullscreen Preview */}
      <Modal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        useRNModal={true}
        avoidKeyboard={false}
        closeOnOverlayClick
        size="full"
        className="m-0 p-0"
      >
        <ModalBackdrop />
        <ModalContent
          className="m-0 h-full rounded-none border-0 bg-black p-0"
          style={{ shadowColor: 'transparent', elevation: 0 }}
        >
          <ModalBody
            className="h-full flex-1 p-0"
            contentContainerStyle={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              margin: 0,
            }}
          >
            {previewUrl && (
              <ZoomableMedia
                mediaUrl={previewUrl}
                onClose={() => setPreviewUrl(null)}
                onLongPress={() => setShowMediaActions(true)}
              />
            )}

            <TouchableOpacity
              activeOpacity={0.5}
              onPress={() => setPreviewUrl(null)}
              style={{
                position: 'absolute',
                top: insets.top + 12,
                right: 12,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                padding: 8,
                zIndex: 30,
              }}
            >
              <Icon as={X} size="sm" className="text-white" />
            </TouchableOpacity>
          </ModalBody>
          <MediaActions
            isOpen={showMediaActions}
            onClose={() => setShowMediaActions(false)}
            mediaUrl={previewUrl ?? undefined}
            workflowId={workflowId}
            serverId={serverId}
          />
        </ModalContent>
      </Modal>

      <DeleteAlert
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={confirmDelete}
        title={selectedMedia.size > 1 ? 'Delete Selected Media' : 'Delete Media'}
        description={
          selectedMedia.size > 1
            ? `Are you sure you want to delete ${selectedMedia.size} items? This action cannot be undone.`
            : 'Are you sure you want to delete this item? This action cannot be undone.'
        }
      />
    </View>
  );
}

const keyExtractor = (item: { url: string }) => item.url;
