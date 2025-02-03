import { ModelSelector } from '@/components/selectors/model';
import { Node } from '@/types/node';
import { useState } from 'react';
import { View } from 'react-native';
type CheckpointLoaderSimpleProps = {
  node: Node;
};

export default function CheckpointLoaderSimple({
  node,
}: CheckpointLoaderSimpleProps) {
  const [model, setModel] = useState(node.inputs.ckpt_name);

  return (
    <View>
      <ModelSelector
        value={model}
        type="checkpoints"
        onChange={(value) => {
          setModel(value);
        }}
      />
    </View>
  );
}
