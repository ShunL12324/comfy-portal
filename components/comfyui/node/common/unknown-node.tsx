import { Badge, BadgeIcon, BadgeText } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useGenerationNodeState } from '@/context/generation-context';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import * as Linking from 'expo-linking';
import { AlertCircle, GitPullRequest } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import BaseNode from './base-node';
import SubItem from './sub-item';

interface UnknownNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function UnknownNode({ node, serverId, workflowId }: UnknownNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const { isCurrentNode, isGenerating } = useGenerationNodeState(node.id);
  const inputs = node.inputs;

  // 过滤出非数组类型的输入
  const displayableInputs = Object.entries(inputs).filter(([_, value]) => !Array.isArray(value));

  const handleRequestSupport = () => {
    const title = encodeURIComponent(`Node Support Request: ${node.class_type}`);
    const url = `https://github.com/ShunL12324/comfy-portal/issues/new?template=node_support.yml&title=${title}&node-type=${encodeURIComponent(node.class_type)}`;
    Linking.openURL(url);
  };

  const renderInput = (key: string, value: any) => {
    if (typeof value === 'string') {
      // 如果值是 'enable' 或 'disable'，使用Switch
      if (value === 'enable' || value === 'disable') {
        return (
          <SubItem key={key} title={key}>
            <Switch
              size="sm"
              value={value === 'enable'}
              onValueChange={(newValue) => {
                updateNodeInput(workflowId, node.id, key, newValue ? 'enable' : 'disable');
              }}
            />
          </SubItem>
        );
      }
      // 其他字符串使用Input
      return (
        <SubItem key={key} title={key}>
          <Input className="rounded-lg border-0 bg-background-50">
            <InputField
              placeholder={key}
              value={value}
              size="sm"
              onChangeText={(newValue: string) => {
                updateNodeInput(workflowId, node.id, key, newValue);
              }}
            />
          </Input>
        </SubItem>
      );
    }
    // 对于数字类型，使用Input，但设置keyboardType为numeric
    if (typeof value === 'number') {
      return (
        <SubItem key={key} title={key}>
          <Input className="rounded-lg border-0 bg-background-50">
            <InputField
              placeholder={key}
              value={value.toString()}
              keyboardType="numeric"
              size="sm"
              onChangeText={(newValue: string) => {
                const numValue = parseFloat(newValue);
                if (!isNaN(numValue)) {
                  updateNodeInput(workflowId, node.id, key, numValue);
                }
              }}
            />
          </Input>
        </SubItem>
      );
    }
    // 对于布尔值，使用Switch
    if (typeof value === 'boolean') {
      return (
        <SubItem key={key} title={key}>
          <Switch
            size="sm"
            value={value}
            onValueChange={(newValue) => {
              updateNodeInput(workflowId, node.id, key, newValue);
            }}
          />
        </SubItem>
      );
    }
    // 对于其他类型，显示只读文本
    return (
      <SubItem key={key} title={key}>
        <Text className="text-typography-500">{JSON.stringify(value)}</Text>
      </SubItem>
    );
  };

  return (
    <BaseNode
      node={node}
      badges={
        <>
          <Badge size="sm" variant="solid" action="warning">
            <BadgeIcon as={AlertCircle} className="mr-1" />
            <BadgeText>Compat</BadgeText>
          </Badge>
          <TouchableOpacity
            onPress={handleRequestSupport}
            className="ml-1 flex-row items-center justify-center rounded-sm bg-background-50 px-2 py-1 active:bg-background-100"
          >
            <Icon as={GitPullRequest} size="sm" className="mr-1 text-blue-500" />
            <Text className="text-xs text-blue-500">Request Support</Text>
          </TouchableOpacity>
        </>
      }
    >
      <VStack space="md" className="w-full">
        {displayableInputs.length > 0 ? (
          displayableInputs.map(([key, value]) => renderInput(key, value))
        ) : (
          <Text size="sm" className="text-typography-500">
            This node has no adjustable parameters.
          </Text>
        )}
      </VStack>
    </BaseNode>
  );
}
