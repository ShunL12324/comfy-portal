import { ModelSelector } from '@/components/selectors/model';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import BaseNode from '../../common/base-node';
interface DualCLIPLoaderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function DualCLIPLoader({ node, serverId, workflowId }: DualCLIPLoaderProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <VStack space="md">
        <ModelSelector
          value={node.inputs.clip_name1}
          onChange={(model) => {
            updateNodeInput(workflowId, node.id, 'clip_name1', model);
          }}
          type="text_encoders"
          serverId={serverId}
        />
        <ModelSelector
          value={node.inputs.clip_name2}
          onChange={(model) => {
            updateNodeInput(workflowId, node.id, 'clip_name2', model);
          }}
          type="text_encoders"
          serverId={serverId}
        />
      </VStack>
    </BaseNode>
  );
}
