import { Node } from '@/types/workflow';
import { ComponentType } from 'react';
import UnknownNode from '../common/unknown-node';
import BasicGuider from './base/BasicGuider';
import BasicScheduler from './base/BasicScheduler';
import CheckpointLoaderSimple from './base/CheckpointLoaderSimple';
import CLIPSetLastLayer from './base/CLIPSetLastLayer';
import CLIPTextEncode from './base/CLIPTextEncode';
import CLIPTextEncodeSDXL from './base/CLIPTextEncodeSDXL';
import DualCLIPLoader from './base/DualCLIPLoader';
import EmptyLatentImage from './base/EmptyLatentImage';
import EmptySD3LatentImage from './base/EmptySD3LatentImage';
import FluxGuidance from './base/FluxGuidance';
import ImagePadForOutpaint from './base/ImagePadForOutpaint';
import ImageScale from './base/ImageScale';
import KSampler from './base/KSampler';
import KSamplerAdvanced from './base/KSamplerAdvanced';
import KSamplerSelect from './base/KSamplerSelect';
import LoadImage from './base/LoadImage';
import LoraLoader from './base/LoraLoader';
import ModelSamplingFlux from './base/ModelSamplingFlux';
import PreviewImage from './base/PreviewImage';
import RandomNoise from './base/RandomNoise';
import SamplerCustomAdvanced from './base/SamplerCustomAdvanced';
import SaveImage from './base/SaveImage';
import UNETLoader from './base/UNETLoader';
import VAEDecode from './base/VAEDecode';
import VAEEncode from './base/VAEEncode';
import VAEEncodeForInpaint from './base/VAEEncodeForInpaint';
import VAELoader from './base/VAELoader';
import LoraLoaderModelOnly from './base/LoraLoaderModelOnly';
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
  'FluxGuidance': FluxGuidance,
  'UNETLoader': UNETLoader,
  'VAELoader': VAELoader,
  'DualCLIPLoader': DualCLIPLoader,
  'SamplerCustomAdvanced': SamplerCustomAdvanced,
  'KSamplerSelect': KSamplerSelect,
  'BasicScheduler': BasicScheduler,
  'BasicGuider': BasicGuider,
  'RandomNoise': RandomNoise,
  'EmptySD3LatentImage': EmptySD3LatentImage,
  'ModelSamplingFlux': ModelSamplingFlux,
  'VAEEncode': VAEEncode,
  'LoadImage': LoadImage,
  'ImageScale': ImageScale,
  'CLIPTextEncodeSDXL': CLIPTextEncodeSDXL,
  'VAEEncodeForInpaint': VAEEncodeForInpaint,
  'ImagePadForOutpaint': ImagePadForOutpaint,
  'LoraLoaderModelOnly': LoraLoaderModelOnly,
  // add more node types here
};

// get node component function
export function getNodeComponent(classType: string): ComponentType<NodeContentProps> {
  return nodeComponentMap[classType] || UnknownNode;
} 