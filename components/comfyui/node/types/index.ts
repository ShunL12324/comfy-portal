import { Node } from '@/types/workflow';
import { ComponentType } from 'react';
import UnknownNode from '../common/unknown-node';
import CheckpointLoaderSimple from './base/CheckpointLoaderSimple';
import CLIPSetLastLayer from './base/CLIPSetLastLayer';
import CLIPTextEncode from './base/CLIPTextEncode';
import EmptyLatentImage from './base/EmptyLatentImage';
import KSampler from './base/KSampler';
import KSamplerAdvanced from './base/KSamplerAdvanced';
import LoraLoader from './base/LoraLoader';
import PreviewImage from './base/PreviewImage';
import SaveImage from './base/SaveImage';
import VAEDecode from './base/VAEDecode';
interface NodeContentProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export const nodeComponentMap: Record<string, ComponentType<NodeContentProps>> = {
  'CheckpointLoaderSimple': CheckpointLoaderSimple,
  'KSampler': KSampler,
  'KSamplerAdvanced': KSamplerAdvanced,
  'CLIPTextEncode': CLIPTextEncode,
  'CLIPSetLastLayer': CLIPSetLastLayer,
  'EmptyLatentImage': EmptyLatentImage,
  'VAEDecode': VAEDecode,
  'PreviewImage': PreviewImage,
  'SaveImage': SaveImage,
  'LoraLoader': LoraLoader,
  // add more node types here
};

// get node component function
export function getNodeComponent(classType: string): ComponentType<NodeContentProps> {
  return nodeComponentMap[classType] || UnknownNode;
} 