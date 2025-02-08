import { Node } from '@/types/workflow';
import { View } from 'react-native';
interface KSamplerProps {
  node: Node;
  serverId: string;
  workflowId: string;
}
export default function KSampler({ node, serverId, workflowId }: KSamplerProps) {
  return <View>KSampler</View>;
}
