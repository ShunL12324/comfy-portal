import { ApiCallTemplate, GenerationParams, LoraConfig } from '@/types/preset';
import { ApiCall, node } from '../api-call';

export abstract class BaseApiCallTemplate implements ApiCallTemplate {
  abstract getTemplate(): ApiCall;

  protected abstract getInitialNodeIds(): {
    modelNodeId: string;
    clipNodeId: string;
    startLoraNodeId: number;
  };

  protected createLoraNode(
    nodeId: string,
    lora: LoraConfig,
    modelConnection: [string, number],
    clipConnection: [string, number]
  ): node {
    return {
      inputs: {
        lora_name: lora.name,
        strength_model: lora.strengthModel,
        strength_clip: lora.strengthClip,
        model: modelConnection,
        clip: clipConnection,
      },
      class_type: "LoraLoader",
      _meta: {
        title: "LoRA Loader"
      }
    };
  }

  protected handleLoras(apiCall: ApiCall, params: GenerationParams): { modelNodeId: string; clipNodeId: string } {
    const { modelNodeId: initialModelNodeId, clipNodeId: initialClipNodeId, startLoraNodeId } = this.getInitialNodeIds();

    if (params.loras && params.loras.length > 0) {
      const validLoras = params.loras.filter(lora => lora.name.trim() !== '');
      if (validLoras.length > 0) {
        let lastModelNodeId = initialModelNodeId;
        let lastClipNodeId = initialClipNodeId;
        let nextNodeId = startLoraNodeId;

        validLoras.forEach((lora) => {
          const nodeId = nextNodeId.toString();
          apiCall[nodeId] = this.createLoraNode(
            nodeId,
            lora,
            [lastModelNodeId, 0],
            [lastClipNodeId, lastClipNodeId === initialClipNodeId ? 0 : 1]
          );

          lastModelNodeId = nodeId;
          lastClipNodeId = nodeId;
          nextNodeId++;
        });

        return {
          modelNodeId: lastModelNodeId,
          clipNodeId: lastClipNodeId
        };
      }
    }
    return {
      modelNodeId: initialModelNodeId,
      clipNodeId: initialClipNodeId
    };
  }

  abstract fillTemplate(params: GenerationParams): ApiCall;
} 