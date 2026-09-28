import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Copy } from '@/components/ui/design-system/primitives';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { Info } from '@/constants/icons';
import { View } from 'react-native';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';
interface SaveImageProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function SaveImage({ node, serverId, workflowId }: SaveImageProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="Filename Prefix">
        <Input className="rounded-lg bg-surface-raised w-full border-0">
          <InputField
            placeholder="Enter filename prefix"
            className="bg-surface-raised w-full border-0"
            value={node.inputs?.filename_prefix || ''}
            onChangeText={(value) => updateNodeInput(workflowId, node.id, 'filename_prefix', value)}
          />
        </Input>
        <View className="mt-2 gap-2 flex-row items-start">
          <Icon as={Info} size="xs" className="text-content-secondary mt-0.5" />
          <Copy size="metadata" muted className="flex-1">
            This will only affect the filename of the image stored on the server.
          </Copy>
        </View>
      </SubItem>
    </BaseNode>
  );
}
