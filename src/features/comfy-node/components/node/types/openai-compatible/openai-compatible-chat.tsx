import { NativeSwitch } from '@/components/ui/design-system/native-controls';
import { useNodeSchema } from '@/hooks/use-node-schema';
import { useState } from 'react';
import BaseNode from '../../common/base-node';
import SchemaField from '../../common/schema-field';
import { NodeEditorProps } from '../../common/schema-node';
import SeedControl from '../../common/seed-control';
import SubItem from '../../common/sub-item';

/**
 * An OpenAI-compatible chat call. The prompt parts and images are wired in;
 * the connection, model and generation settings are here.
 *
 * `model` is a combo on the server, but its options are filled client-side by
 * the desktop UI's "Refresh models" button, so the server's own list is only
 * a placeholder — the model id is typed instead. The node's advanced settings
 * sit behind a local toggle, as they do on desktop.
 */
export default function OpenAICompatibleChat({ node, serverId, workflowId }: NodeEditorProps) {
  const schema = useNodeSchema(serverId, node.class_type);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const shared = { node, serverId, workflowId, schema };
  const isJoin = node.inputs.input_mode !== 'separate_messages';

  return (
    <BaseNode node={node}>
      <SchemaField
        {...shared}
        inputKey="base_url"
        title="Base URL"
        placeholder="https://api.openai.com/v1"
        fallback={{ kind: 'string', multiline: false }}
      />
      <SchemaField
        {...shared}
        inputKey="api_key"
        title="API Key"
        placeholder="sk-... or env:VARIABLE"
        secure
        fallback={{ kind: 'string', multiline: false }}
        hint="Saved inside the workflow. Leave empty to use the server's environment."
      />
      <SchemaField
        {...shared}
        inputKey="model"
        title="Model"
        placeholder="Model id"
        fallback={{ kind: 'string', multiline: false }}
      />
      <SchemaField
        {...shared}
        inputKey="system_prompt"
        title="System Prompt"
        expandable
        placeholder="Optional instructions"
        fallback={{ kind: 'string', multiline: true }}
      />
      <SchemaField {...shared} inputKey="reuse_last_result" title="Reuse Last Answer" fallback={{ kind: 'boolean' }} />
      {node.inputs.seed !== undefined ? (
        <SeedControl node={node} workflowId={workflowId} inputKey="seed" title="Seed" defaultRandom={false} />
      ) : null}

      <SubItem
        title="Advanced"
        rightComponent={<NativeSwitch label="Advanced" value={showAdvanced} onValueChange={setShowAdvanced} />}
      />
      {showAdvanced ? (
        <>
          <SchemaField
            {...shared}
            inputKey="temperature"
            title="Temperature (-1 = omit)"
            fallback={{ kind: 'float', min: -1, max: 2, step: 0.01 }}
          />
          <SchemaField
            {...shared}
            inputKey="max_tokens"
            title="Max Tokens (0 = provider)"
            control="stepper"
            fallback={{ kind: 'int', min: 0, max: 1000000, step: 1 }}
          />
          <SchemaField
            {...shared}
            inputKey="reasoning_effort"
            title="Reasoning Effort"
            fallback={{ kind: 'combo', options: ['default', 'none', 'low', 'medium', 'high', 'max'] }}
          />
          <SchemaField
            {...shared}
            inputKey="input_mode"
            title="Input Mode"
            fallback={{ kind: 'combo', options: ['join', 'separate_messages'] }}
            labels={{ join: 'Join into one message', separate_messages: 'Separate messages' }}
          />
          {isJoin ? (
            <SchemaField
              {...shared}
              inputKey="separator"
              title="Separator"
              fallback={{ kind: 'string', multiline: false }}
            />
          ) : null}
          <SchemaField
            {...shared}
            inputKey="timeout"
            title="Timeout (s)"
            control="stepper"
            fallback={{ kind: 'int', min: 5, max: 3600, step: 1 }}
          />
          <SchemaField
            {...shared}
            inputKey="image_detail"
            title="Image Detail"
            fallback={{ kind: 'combo', options: ['auto', 'low', 'high'] }}
          />
          <SchemaField
            {...shared}
            inputKey="image_format"
            title="Image Format"
            fallback={{ kind: 'combo', options: ['jpeg', 'png', 'webp'] }}
          />
          <SchemaField
            {...shared}
            inputKey="image_max_side"
            title="Image Max Side (0 = full size)"
            control="stepper"
            fallback={{ kind: 'int', min: 0, max: 8192, step: 64 }}
          />
          <SchemaField
            {...shared}
            inputKey="video_max_mb"
            title="Video Max (MB)"
            control="stepper"
            fallback={{ kind: 'int', min: 1, max: 500, step: 1 }}
          />
        </>
      ) : null}
    </BaseNode>
  );
}
