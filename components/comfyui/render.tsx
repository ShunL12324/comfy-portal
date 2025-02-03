import { Text } from '@/components/ui/text';
import { Node, NodeType } from '@/types/node';
import { View } from 'react-native';
import { Center } from '../ui/center';
import CheckpointLoaderSimple from './node/CheckpointLoaderSimple';
import KSampler from './node/KSampler';
type NodeRenderProps = {
  node: Node;
  onNodeChange: (node: Node) => void;
};

const renderNodeContent = (node: Node, onNodeChange: (node: Node) => void) => {
  switch (node.type) {
    case NodeType.CheckpointLoaderSimple:
      return <CheckpointLoaderSimple node={node} />;
    case NodeType.KSampler:
      return <KSampler node={node} />;
    default:
      return null;
  }
};

const renderNodeInfo = (node: Node) => {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-ellipsis pl-1 text-sm font-semibold text-typography-900">
        {node._meta?.title || node.type}
      </Text>
      <Center className="h-8 w-8 rounded-md bg-accent-600">
        <Text className="text-xs font-extrabold text-typography-0">
          {node.index}
        </Text>
      </Center>
    </View>
  );
};

export const NodeRender = ({ node }: NodeRenderProps) => {
  return (
    <View className="w-full flex-col justify-center gap-2">
      {renderNodeInfo(node)}
      {renderNodeContent(node)}
    </View>
  );
};
