import { NumberInput } from '@/components/self-ui/number-input';
import { Text } from '@/components/ui/text';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';
import { MAX_AUDIOS, MAX_IMAGES, MAX_VIDEOS } from './constants';

interface MiniMaxH3EasyMediaBridgeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

/**
 * Declares how many media sockets the bridge exposes. The sockets themselves
 * are links, so only the counts are adjustable here.
 */
export default function MiniMaxH3EasyMediaBridge({ node, workflowId }: MiniMaxH3EasyMediaBridgeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  const counts: { key: string; title: string; max: number }[] = [
    { key: 'image_count', title: 'Images', max: MAX_IMAGES },
    { key: 'video_count', title: 'Videos', max: MAX_VIDEOS },
    { key: 'audio_count', title: 'Audio clips', max: MAX_AUDIOS },
  ];

  return (
    <BaseNode node={node}>
      {counts.map(({ key, title, max }) => (
        <SubItem key={key} title={title} node={node} dependencies={[key]}>
          <NumberInput
            value={node.inputs[key]}
            onChange={(value) => updateNodeInput(workflowId, node.id, key, Number(value))}
            minValue={0}
            maxValue={max}
            step={1}
            decimalPlaces={0}
            buttonSize={24}
            space={12}
          />
        </SubItem>
      ))}
      <SubItem title="Media sources">
        <Text size="sm" className="text-typography-500">
          Connect each source to its numbered input on the desktop editor. Only the counts are
          editable here.
        </Text>
      </SubItem>
    </BaseNode>
  );
}
