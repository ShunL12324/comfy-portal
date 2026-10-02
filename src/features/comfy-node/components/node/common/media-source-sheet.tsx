import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Copy, Title } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { designTokens as t } from '@/constants/design-tokens';
import { Camera, Folder, HardDrive, Image as ImageIcon, type LucideIcon } from '@/constants/icons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type MediaSource = 'server' | 'library' | 'files' | 'camera';

export interface MediaSourceSheetRef {
  present: () => void;
  /** Closes without acting on any choice, e.g. when an upload starts from elsewhere. */
  dismiss: () => void;
}

interface MediaSourceSheetProps {
  title: string;
  /** Upload sources, in order; "Already on Server" always leads. */
  uploads: Exclude<MediaSource, 'server'>[];
  /** Runs once the sheet has closed, so a system picker never opens over it. */
  onPick: (source: MediaSource) => void;
}

const UPLOAD_ROWS: Record<Exclude<MediaSource, 'server'>, { icon: LucideIcon; label: string }> = {
  library: { icon: ImageIcon, label: 'Photo Library' },
  files: { icon: Folder, label: 'Files' },
  camera: { icon: Camera, label: 'Camera' },
};

/** Room for the title, the server row, the Upload label and each upload row. */
const snapPointFor = (rows: number) => `${28 + rows * 6}%`;

/**
 * Where a loader node's file comes from: a file already in the server's
 * `input/` folder, or an upload. Shared by Load Image and the video loaders.
 */
export const MediaSourceSheet = forwardRef<MediaSourceSheetRef, MediaSourceSheetProps>(function MediaSourceSheet(
  { title, uploads, onPick },
  ref,
) {
  const safeAreaInsets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const pendingRef = useRef<MediaSource | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => {
        pendingRef.current = null;
        sheetRef.current?.dismiss();
      },
    }),
    [],
  );

  const choose = (source: MediaSource) => {
    pendingRef.current = source;
    sheetRef.current?.dismiss();
  };

  const handleDismiss = () => {
    const source = pendingRef.current;
    pendingRef.current = null;
    if (source) onPick(source);
  };

  return (
    <ThemedBottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={[snapPointFor(uploads.length)]}
      topInset={safeAreaInsets.top}
      enablePanDownToClose
      onDismiss={handleDismiss}
    >
      <BottomSheetView
        style={{ paddingHorizontal: t.layout.inset, paddingBottom: safeAreaInsets.bottom + t.layout.inset }}
      >
        <VStack space="sm">
          <Title compact className="mb-1">
            {title}
          </Title>

          <Pressable
            accessibilityRole="button"
            onPress={() => choose('server')}
            className="gap-3 rounded-xl bg-surface-raised px-4 py-3 flex-row items-center"
          >
            <Icon size="sm" as={HardDrive} className="text-content-body" />
            <VStack className="flex-1">
              <Copy>Already on Server</Copy>
              <Copy size="metadata" muted>
                Pick from the server&apos;s input folder — no upload
              </Copy>
            </VStack>
          </Pressable>

          <Copy size="metadata" muted className="mb-1 mt-2" style={{ fontWeight: '500' }}>
            Upload
          </Copy>

          {uploads.map((source) => (
            <Pressable
              key={source}
              accessibilityRole="button"
              onPress={() => choose(source)}
              className="gap-3 rounded-xl bg-surface-raised px-4 py-3 flex-row items-center"
            >
              <Icon size="sm" as={UPLOAD_ROWS[source].icon} className="text-content-body" />
              <Copy>{UPLOAD_ROWS[source].label}</Copy>
            </Pressable>
          ))}
        </VStack>
      </BottomSheetView>
    </ThemedBottomSheetModal>
  );
});
