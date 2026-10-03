import { Copy } from '@/components/ui/design-system/primitives';
import { resolutionFor } from '@/features/comfy-node/utils/resolution';
import { toNumber } from '@/features/comfy-node/utils/schema-inputs';
import SubItem from '../../common/sub-item';
import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const ASPECT_RATIOS = [
  '1:1 (Square)',
  '2:3 (Portrait Photo)',
  '3:2 (Photo)',
  '3:4 (Portrait Standard)',
  '4:3 (Standard)',
  '9:16 (Portrait Widescreen)',
  '16:9 (Widescreen)',
  '21:9 (Ultrawide)',
];

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'aspect_ratio', title: 'Aspect Ratio', fallback: { kind: 'combo', options: ASPECT_RATIOS } },
  { inputKey: 'megapixels', title: 'Megapixels', fallback: { kind: 'float', min: 0.1, max: 16, step: 0.1 } },
  {
    inputKey: 'multiple',
    title: 'Round to Multiple of',
    fallback: { kind: 'int', min: 8, max: 128, step: 4 },
  },
];

/**
 * Width and height from an aspect ratio and a pixel budget. The node's own
 * canvas widget previews the result; this shows the same numbers, computed the
 * way the node computes them.
 */
export default function ResolutionSelector(props: NodeEditorProps) {
  const { inputs } = props.node;
  const size =
    typeof inputs.aspect_ratio === 'string'
      ? resolutionFor(inputs.aspect_ratio, toNumber(inputs.megapixels, NaN), toNumber(inputs.multiple, NaN))
      : null;

  return (
    <SchemaNode
      {...props}
      fields={FIELDS}
      footer={() =>
        size ? (
          <SubItem
            title="Output"
            rightComponent={
              <Copy mono>
                {size.width} × {size.height}
              </Copy>
            }
          />
        ) : null
      }
    />
  );
}
