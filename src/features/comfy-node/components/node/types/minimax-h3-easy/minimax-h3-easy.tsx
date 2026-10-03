import { OptionSelector } from '@/components/common/selectors/option-selector';
import { NativeSwitch } from '@/components/ui/design-system/native-controls';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { PromptEditorModal, PromptEditorModalRef } from '@/features/ai-assistant/components/prompt-editor-modal';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/use-node-schema';
import { Maximize2 } from '@/constants/icons';
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import BaseNode from '../../common/base-node';
import SchemaField from '../../common/schema-field';
import SubItem from '../../common/sub-item';
import {
  ASPECT_RATIO_OPTIONS,
  KEYFRAME_ROLE_OPTIONS,
  MODE_OPTIONS,
  NUMBER_FALLBACKS,
  REFERENCE_MENTION_OPTIONS,
  REF_IMAGE_SIZE_OPTIONS,
  RESOLUTION_OPTIONS,
  SCENE_GUIDE_OPTIONS,
  withCurrentValue,
} from './constants';

interface MiniMaxH3EasyProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

/**
 * The extension's main node. Media inputs are wired as links on desktop and
 * aren't editable here; everything else is exposed.
 *
 * Mirrors the extension's own UI in two places: the `advanced` toggle gates
 * the same four fields, and width/height only appear for the `custom`
 * resolution (other presets derive dimensions from the aspect ratio).
 */
export default function MiniMaxH3Easy({ node, serverId, workflowId }: MiniMaxH3EasyProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  const shared = { node, serverId, workflowId, schema };
  const promptEditorRef = useRef<PromptEditorModalRef>(null);

  const setInput = useCallback(
    (key: string, value: unknown) => updateNodeInput(workflowId, node.id, key, value),
    [updateNodeInput, workflowId, node.id],
  );

  const handleOpenEditor = useCallback(() => {
    promptEditorRef.current?.present({
      initialValue: node.inputs.prompt || '',
      onSave: (value) => setInput('prompt', value),
      title: 'Edit Prompt',
    });
  }, [node.inputs.prompt, setInput]);

  const isAdvanced = node.inputs.advanced === true;
  const isCustomResolution = node.inputs.resolution === 'custom';
  const isReferenceMode = node.inputs.mode === 'reference';

  return (
    <BaseNode node={node}>
      <SubItem title="Mode" node={node} dependencies={['mode']}>
        <OptionSelector
          value={node.inputs.mode ?? 'image'}
          onChange={(value) => setInput('mode', value)}
          options={withCurrentValue(MODE_OPTIONS, node.inputs.mode)}
          title="Mode"
        />
      </SubItem>

      <SubItem
        title="Prompt"
        rightComponent={
          <View className="gap-2 flex-row items-center">
            <Pressable onPress={handleOpenEditor} className="p-1" accessibilityLabel="Expand prompt" hitSlop={11}>
              <Icon as={Maximize2} size="sm" className="text-content-secondary" />
            </Pressable>
          </View>
        }
        node={node}
        dependencies={['prompt']}
      >
        <Textarea
          size="sm"
          isReadOnly={false}
          isInvalid={false}
          isDisabled={false}
          className="rounded-md bg-surface-raised w-full border-0"
        >
          <TextareaInput
            placeholder="Describe the video..."
            value={node.inputs?.prompt || ''}
            onChangeText={(text) => setInput('prompt', text)}
          />
        </Textarea>
      </SubItem>

      <SubItem title="Resolution" node={node} dependencies={['resolution']}>
        <OptionSelector
          value={node.inputs.resolution ?? '480P'}
          onChange={(value) => setInput('resolution', value)}
          options={withCurrentValue(RESOLUTION_OPTIONS, node.inputs.resolution)}
          title="Resolution"
        />
      </SubItem>

      {!isCustomResolution && (
        <SubItem title="Aspect Ratio" node={node} dependencies={['aspect_ratio']}>
          <OptionSelector
            value={node.inputs.aspect_ratio ?? '16:9'}
            onChange={(value) => setInput('aspect_ratio', value)}
            options={withCurrentValue(ASPECT_RATIO_OPTIONS, node.inputs.aspect_ratio)}
            title="Aspect Ratio"
          />
        </SubItem>
      )}

      {isCustomResolution && (
        <>
          <SchemaField {...shared} inputKey="width" title="Width" fallback={NUMBER_FALLBACKS.width} />
          <SchemaField {...shared} inputKey="height" title="Height" fallback={NUMBER_FALLBACKS.height} />
        </>
      )}

      <SchemaField {...shared} inputKey="seconds" title="Duration (seconds)" fallback={NUMBER_FALLBACKS.seconds} />

      <SubItem title="Scene Guide" node={node} dependencies={['prompt_optimizer_scene_guide']}>
        <OptionSelector
          value={node.inputs.prompt_optimizer_scene_guide ?? 'none'}
          onChange={(value) => setInput('prompt_optimizer_scene_guide', value)}
          options={withCurrentValue(SCENE_GUIDE_OPTIONS, node.inputs.prompt_optimizer_scene_guide)}
          title="Scene Guide"
        />
      </SubItem>

      <SubItem
        title="Prompt optimizer"
        rightComponent={
          <NativeSwitch
            label="Prompt optimizer"
            value={node.inputs.prompt_optimizer_settings === true}
            onValueChange={(value: boolean) => setInput('prompt_optimizer_settings', value)}
          />
        }
      />

      <SubItem
        title="Advanced"
        rightComponent={
          <NativeSwitch
            label="Advanced"
            value={isAdvanced}
            onValueChange={(value: boolean) => setInput('advanced', value)}
          />
        }
      />

      {isAdvanced && (
        <>
          <SchemaField {...shared} inputKey="fps" title="FPS" fallback={NUMBER_FALLBACKS.fps} />

          {!isReferenceMode && (
            <SubItem title="Single image is" node={node} dependencies={['keyframe_role']}>
              <OptionSelector
                value={node.inputs.keyframe_role ?? 'first'}
                onChange={(value) => setInput('keyframe_role', value)}
                options={withCurrentValue(KEYFRAME_ROLE_OPTIONS, node.inputs.keyframe_role)}
                title="Single image is"
              />
            </SubItem>
          )}

          {isReferenceMode && (
            <>
              <SubItem title="Reference image size" node={node} dependencies={['ref_image_size']}>
                <OptionSelector
                  value={node.inputs.ref_image_size ?? '1k'}
                  onChange={(value) => setInput('ref_image_size', value)}
                  options={withCurrentValue(REF_IMAGE_SIZE_OPTIONS, node.inputs.ref_image_size)}
                  title="Reference image size"
                />
              </SubItem>
              <SubItem title="Mention media" node={node} dependencies={['reference_mention_mode']}>
                <OptionSelector
                  value={node.inputs.reference_mention_mode ?? 'index'}
                  onChange={(value) => setInput('reference_mention_mode', value)}
                  options={withCurrentValue(REFERENCE_MENTION_OPTIONS, node.inputs.reference_mention_mode)}
                  title="Mention media"
                />
              </SubItem>
            </>
          )}
        </>
      )}

      <PromptEditorModal ref={promptEditorRef} />
    </BaseNode>
  );
}
