import { Node } from '@/features/workflow/types';
import { getNodeComponent } from './types';

import React, { memo } from 'react';

interface NodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

const NodeComponent = memo(function NodeComponent({ node, serverId, workflowId }: NodeProps) {
  const NodeContent = getNodeComponent(node.class_type);
  return <NodeContent node={node} serverId={serverId} workflowId={workflowId} />;
});

export default NodeComponent;
