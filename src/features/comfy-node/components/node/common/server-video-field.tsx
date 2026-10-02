import { OptionSelector } from '@/components/common/selectors/option-selector';
import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { Folder, Upload, X } from '@/constants/icons';
import { comboOptions } from '@/features/comfy-node/utils/schema-inputs';
import { Node } from '@/features/workflow/types';
import { uploadImage } from '@/services/comfy-api';
import { NodeSchema, clearNodeSchemaCache } from '@/services/node-schema';
import { showToast } from '@/utils/toast';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import SubItem from './sub-item';

interface ServerVideoFieldProps {
  node: Node;
  serverId: string;
  schema: NodeSchema | null;
  /** Combo input holding the filename, e.g. `video`. */
  inputKey: string;
  title: string;
  onChange: (filename: string) => void;
}

interface PickedVideo {
  uri: string;
  name: string;
  mimeType?: string;
}

/**
 * Video counterpart of LoadImage's source picker, for loaders such as VHS
 * whose input is a file in ComfyUI's `input/` folder.
 *
 * The node's own combo options are the inventory — VHS builds them by listing
 * `input/` for video extensions — so picking needs no upload. Uploading goes
 * through `/upload/image`, which stores any file there (VHS's own upload
 * button uses it the same way), and refetches the definition so the new file
 * becomes selectable.
 *
 * Videos are sent as-is: unlike stills they aren't re-encoded on the phone.
 */
export default function ServerVideoField({ node, serverId, schema, inputKey, title, onChange }: ServerVideoFieldProps) {
  const c = useDesign();
  const [progress, setProgress] = useState<number | null>(null);
  const cancelRef = useRef<(() => Promise<void>) | null>(null);

  const value = node.inputs[inputKey];
  const current = typeof value === 'string' ? value : '';
  const spec = schema?.inputs[inputKey];
  const files = spec?.kind === 'combo' ? spec.options : [];
  const isMissing = spec?.kind === 'combo' && !!current && !files.includes(current);

  // The file list is baked into the node definition; dropping it refetches.
  const handleRefresh = useCallback(async () => clearNodeSchemaCache(serverId), [serverId]);

  const upload = async (video: PickedVideo) => {
    setProgress(0);
    try {
      const { promise, cancel } = uploadImage(video.uri, video.name, serverId, video.mimeType, setProgress);
      cancelRef.current = cancel;
      const response = await promise;
      onChange(response.name);
      clearNodeSchemaCache(serverId);
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('canceled'))) {
        showToast.error('Error uploading video', error instanceof Error ? error.message : undefined);
      }
    } finally {
      setProgress(null);
      cancelRef.current = null;
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast.error('Permission to access media library is required', undefined);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      shouldDownloadFromNetwork: true,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    await upload({
      uri: asset.uri,
      name: asset.fileName || asset.uri.split('/').pop() || 'video.mp4',
      mimeType: asset.mimeType,
    });
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['video/*'], copyToCacheDirectory: true });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    await upload({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined });
  };

  return (
    <SubItem title={title}>
      <View style={{ gap: t.node.labelGap }}>
        <OptionSelector
          value={current}
          onChange={onChange}
          options={comboOptions(files, current)}
          title="Server Videos"
          showSearch={files.length > 8}
          searchPlaceholder="Search videos..."
          onRefresh={handleRefresh}
        />
        {isMissing ? (
          <Copy size="metadata" style={{ color: c.danger }}>
            Not in the server&apos;s input folder
          </Copy>
        ) : null}
        {progress !== null ? (
          <View className="flex-row items-center justify-between">
            <Copy size="metadata" muted>
              Uploading… {Math.round(progress * 100)}%
            </Copy>
            <Action kind="text" small icon={X} onPress={() => void cancelRef.current?.()}>
              Cancel
            </Action>
          </View>
        ) : (
          <View className="flex-row">
            <Action kind="text" small icon={Upload} onPress={() => void pickFromLibrary()}>
              Upload from Photos
            </Action>
            <Action kind="text" small icon={Folder} onPress={() => void pickFromFiles()}>
              Files
            </Action>
          </View>
        )}
      </View>
    </SubItem>
  );
}
