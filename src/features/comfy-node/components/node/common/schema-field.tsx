import { ModelSelector } from '@/components/common/selectors/model';
import { OptionSelector } from '@/components/common/selectors/option-selector';
import { NumberInput } from '@/components/self-ui/number-input';
import { NumberSlider } from '@/components/self-ui/slider';
import { NativeSwitch } from '@/components/ui/design-system/native-controls';
import { Copy } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Maximize2 } from '@/constants/icons';
import { PromptEditorModal, PromptEditorModalRef } from '@/features/ai-assistant/components/prompt-editor-modal';
import {
  FieldSpec,
  NumberControl,
  comboOptions,
  decimalPlacesFor,
  numberControlFor,
  pickFieldSpec,
  toNumber,
} from '@/features/comfy-node/utils/schema-inputs';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { NodeSchema, resolveInputSpec } from '@/services/node-schema';
import { ReactNode, useCallback, useRef } from 'react';
import { View } from 'react-native';
import SubItem from './sub-item';
import { designTokens as t } from '@/constants/design-tokens';

export interface SchemaFieldProps {
  node: Node;
  workflowId: string;
  serverId: string;
  /** The node's server definition; `null` while loading or unavailable. */
  schema: NodeSchema | null;
  inputKey: string;
  title: string;
  /** Shape to render while the schema loads, or if the server can't say. */
  fallback: FieldSpec;
  /** Overrides the slider/stepper choice made from the range. */
  control?: NumberControl;
  /** Overrides the increment (not the precision) when the node's is impractically fine. */
  step?: number;
  /** Display labels for combo values; the stored value never changes. */
  labels?: Record<string, string>;
  /** Model folders behind a combo, which then gets the model picker. */
  modelFolders?: string | string[];
  /** Mask a single-line string (API keys). */
  secure?: boolean;
  /** Offer the full-screen editor for a multiline string. */
  expandable?: boolean;
  placeholder?: string;
  /** One line under the control. Use sparingly. */
  hint?: ReactNode;
  /** Replaces the default write, e.g. to fan a combo change out to its children. */
  onChange?: (value: unknown) => void;
}

/**
 * One node input, rendered from the server's definition.
 *
 * Hand-written node editors choose which inputs to show, in what order and
 * under what title; this decides the control. The server supplies the truth
 * — ranges, combo options, defaults — and the editor's fallback stands in
 * until it arrives. An input the workflow doesn't carry renders nothing, and a
 * linked one explains itself instead of offering a control that would write
 * over the link.
 */
export default function SchemaField({
  node,
  workflowId,
  serverId,
  schema,
  inputKey,
  title,
  fallback,
  control,
  step: stepOverride,
  labels,
  modelFolders,
  secure,
  expandable,
  placeholder,
  hint,
  onChange,
}: SchemaFieldProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const promptEditorRef = useRef<PromptEditorModalRef>(null);
  const value = node.inputs[inputKey];

  const setValue = useCallback(
    (next: unknown) => (onChange ? onChange(next) : updateNodeInput(workflowId, node.id, inputKey, next)),
    [onChange, updateNodeInput, workflowId, node.id, inputKey],
  );

  if (value === undefined) return null;

  if (Array.isArray(value)) {
    // SubItem replaces its children with the "linked to other nodes" note.
    return (
      <SubItem title={title} node={node} dependencies={[inputKey]}>
        <View />
      </SubItem>
    );
  }

  const spec = pickFieldSpec(resolveInputSpec(schema, inputKey, node.inputs), fallback);
  const hintLine = hint ? (
    <Copy size="metadata" muted style={{ marginTop: t.node.labelGap }}>
      {hint}
    </Copy>
  ) : null;

  switch (spec.kind) {
    case 'combo': {
      const current = value == null ? '' : String(value);
      if (modelFolders) {
        return (
          <SubItem title={title}>
            <ModelSelector
              value={current}
              onChange={setValue}
              type={modelFolders}
              classType={node.class_type}
              inputName={inputKey}
              serverId={serverId}
            />
            {hintLine}
          </SubItem>
        );
      }
      const options = comboOptions(spec.options, current, labels);
      return (
        <SubItem title={title}>
          <OptionSelector
            value={current}
            onChange={setValue}
            options={options}
            title={title}
            showSearch={options.length > 8}
          />
          {hintLine}
        </SubItem>
      );
    }

    case 'int':
    case 'float': {
      const specStep = spec.step ?? (spec.kind === 'int' ? 1 : 0.01);
      const step = stepOverride ?? specStep;
      const decimalPlaces = decimalPlacesFor({ kind: spec.kind, step: specStep });
      const numeric = toNumber(value, spec.default ?? spec.min ?? 0);
      const write = (next: number) => setValue(spec.kind === 'int' ? Math.round(next) : next);
      return (
        <SubItem title={title}>
          {(control ?? numberControlFor({ ...spec, step })) === 'slider' ? (
            <NumberSlider
              value={numeric}
              minValue={spec.min}
              maxValue={spec.max}
              step={step}
              decimalPlaces={decimalPlaces}
              onChangeEnd={write}
            />
          ) : (
            <NumberInput
              value={numeric}
              // ComfyUI's INT bounds (±2^63) are past what a JS number holds exactly.
              minValue={Math.max(spec.min ?? -Infinity, Number.MIN_SAFE_INTEGER)}
              maxValue={Math.min(spec.max ?? Infinity, Number.MAX_SAFE_INTEGER)}
              step={step}
              decimalPlaces={decimalPlaces}
              onChange={write}
            />
          )}
          {hintLine}
        </SubItem>
      );
    }

    case 'boolean':
      return (
        <View>
          <SubItem
            title={title}
            rightComponent={
              <NativeSwitch label={title} value={value === true || value === 1} onValueChange={setValue} />
            }
          />
          {hintLine}
        </View>
      );

    case 'string': {
      const text = value == null ? '' : String(value);
      if (!spec.multiline) {
        return (
          <SubItem title={title}>
            <Input className="rounded-md bg-surface-raised border-0" size="sm">
              <InputField
                placeholder={placeholder ?? title}
                value={text}
                onChangeText={setValue}
                secureTextEntry={secure}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Input>
            {hintLine}
          </SubItem>
        );
      }
      return (
        <SubItem
          title={title}
          rightComponent={
            expandable ? (
              <Pressable
                onPress={() =>
                  promptEditorRef.current?.present({ initialValue: text, onSave: setValue, title: `Edit ${title}` })
                }
                className="p-1"
                accessibilityLabel={`Expand ${title}`}
                hitSlop={11}
              >
                <Icon as={Maximize2} size="sm" className="text-content-secondary" />
              </Pressable>
            ) : undefined
          }
        >
          <Textarea
            size="sm"
            isReadOnly={false}
            isInvalid={false}
            isDisabled={false}
            className="rounded-md bg-surface-raised w-full border-0"
          >
            <TextareaInput placeholder={placeholder ?? 'Enter text here...'} value={text} onChangeText={setValue} />
          </Textarea>
          {hintLine}
          {expandable ? <PromptEditorModal ref={promptEditorRef} /> : null}
        </SubItem>
      );
    }
  }
}
