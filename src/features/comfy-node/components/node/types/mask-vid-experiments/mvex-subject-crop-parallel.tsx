import { FieldSpec, dynamicComboUpdates } from '@/features/comfy-node/utils/schema-inputs';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useNodeSchema } from '@/hooks/use-node-schema';
import { WidgetSpec } from '@/services/node-schema';
import { useCallback } from 'react';
import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

export const RESIZE_METHODS = ['auto', 'nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'];

const CROP_SCALE: FieldSpec = { kind: 'float', min: 0, max: 4, step: 0.05, default: 1.5 };
const ASPECT_RATIO: FieldSpec = { kind: 'float', min: 0, max: 10, step: 0.01, default: 0 };
const PADDING: FieldSpec = { kind: 'combo', options: ['guaranteed', 'firm', 'flexible'], default: 'firm' };
const PREFER: FieldSpec = { kind: 'combo', options: ['stillness', 'tightness'], default: 'stillness' };
const SEAMLESS_LOOP: FieldSpec = { kind: 'boolean', default: false };

/**
 * `mode` is a dynamic combo: each mode brings its own settings, stored as
 * `mode.<setting>`. Mirrors the extension's definition so switching modes
 * works offline too; the server's copy wins when it's loaded.
 */
const MODE_CHILDREN: Record<string, Record<string, WidgetSpec>> = {
  combined: { crop_scale: CROP_SCALE, aspect_ratio: ASPECT_RATIO },
  tracked: {
    crop_scale: CROP_SCALE,
    padding: PADDING,
    prefer: PREFER,
    aspect_ratio: ASPECT_RATIO,
    seamless_loop: SEAMLESS_LOOP,
  },
  zoomed: {
    crop_scale: CROP_SCALE,
    padding: PADDING,
    prefer: PREFER,
    pad_surplus_tol: { kind: 'int', min: 1, step: 1, default: 16 },
    zoom_step: { kind: 'float', min: 1, max: 4, step: 0.05, default: 1 },
    aspect_ratio: ASPECT_RATIO,
    seamless_loop: SEAMLESS_LOOP,
  },
};

/**
 * MVEx's `_upscale_size`: a positive value is a floor (crops already that
 * large are left alone), a negative one an exact target reached by scaling
 * down too. One megapixel is 1024 × 1024 px.
 */
const UPSCALE_MEGAPIXELS: SchemaFieldDef = {
  inputKey: 'upscale_megapixels',
  title: 'Upscale to Megapixels (0 = off)',
  fallback: { kind: 'float', min: -16, max: 16, step: 0.05 },
  hint: 'Positive only enlarges smaller crops; negative resizes every crop to that size.',
};

const CHILD_TITLES: Record<string, string> = {
  crop_scale: 'Crop Scale',
  padding: 'Padding',
  prefer: 'Prefer',
  pad_surplus_tol: 'Padding Surplus Tolerance (px)',
  zoom_step: 'Zoom Step',
  aspect_ratio: 'Aspect Ratio (0 = auto)',
  seamless_loop: 'Seamless Loop',
};

export default function MVExSubjectCropParallel(props: NodeEditorProps) {
  const { node, serverId, workflowId } = props;
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  const modeSpec = schema?.inputs.mode;
  const children = (modeSpec?.kind === 'combo' && modeSpec.children) || MODE_CHILDREN;
  const mode = typeof node.inputs.mode === 'string' ? node.inputs.mode : '';

  const handleModeChange = useCallback(
    (next: unknown) => {
      if (typeof next !== 'string') return;
      const updates = dynamicComboUpdates(node.inputs, 'mode', next, children);
      for (const [key, value] of Object.entries(updates)) updateNodeInput(workflowId, node.id, key, value);
    },
    [node.inputs, children, updateNodeInput, workflowId, node.id],
  );

  const modeFields: SchemaFieldDef[] = Object.entries(children[mode] ?? {}).flatMap(([child, spec]) =>
    spec.kind === 'link'
      ? []
      : [
          {
            inputKey: `mode.${child}`,
            title: CHILD_TITLES[child] ?? child,
            fallback: spec,
            control: child === 'pad_surplus_tol' ? 'stepper' : undefined,
          },
        ],
  );

  const fields: SchemaFieldDef[] = [
    {
      inputKey: 'mode',
      title: 'Mode',
      fallback: { kind: 'combo', options: Object.keys(MODE_CHILDREN) },
      labels: { combined: 'Combined', tracked: 'Tracked', zoomed: 'Zoomed' },
      onChange: handleModeChange,
    },
    ...modeFields,
    {
      inputKey: 'divisible_by',
      title: 'Round to Multiple of (px)',
      fallback: { kind: 'int', min: 1, step: 1 },
    },
    UPSCALE_MEGAPIXELS,
    { inputKey: 'resize_method', title: 'Resize Method', fallback: { kind: 'combo', options: RESIZE_METHODS } },
  ];

  return <SchemaNode {...props} fields={fields} />;
}
