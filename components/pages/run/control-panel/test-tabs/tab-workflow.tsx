import { NodeRender } from '@/components/comfyui/render';
import { Node } from '@/types/node';
import { parseNodes, TEST_DATA } from '@/utils/parser';
import { ScrollView } from 'moti';
import { useEffect, useState } from 'react';

export default function WorkflowTab() {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    const nodes = parseNodes(JSON.stringify(TEST_DATA));
    setNodes(nodes);
  }, []);

  return (
    <ScrollView className="flex-1 bg-background-0 p-4">
      {nodes.map((node) => (
        <NodeRender key={node.id} node={node} />
      ))}
    </ScrollView>
  );
}
