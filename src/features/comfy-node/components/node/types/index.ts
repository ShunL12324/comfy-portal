import { Node } from '@/features/workflow/types';
import { ComponentType } from 'react';
import UnknownNode from '../common/unknown-node';
import BasicGuider from './base/BasicGuider';
import BasicScheduler from './base/BasicScheduler';
import CheckpointLoaderSimple from './base/CheckpointLoaderSimple';
import CLIPLoader from './base/CLIPLoader';
import CLIPSetLastLayer from './base/CLIPSetLastLayer';
import CLIPTextEncode from './base/CLIPTextEncode';
import CLIPTextEncodeSDXL from './base/CLIPTextEncodeSDXL';
import CLIPVisionEncode from './base/CLIPVisionEncode';
import CLIPVisionLoader from './base/CLIPVisionLoader';
import DualCLIPLoader from './base/DualCLIPLoader';
import EmptyLatentImage from './base/EmptyLatentImage';
import EmptySD3LatentImage from './base/EmptySD3LatentImage';
import FluxGuidance from './base/FluxGuidance';
import ImagePadForOutpaint from './base/ImagePadForOutpaint';
import ImageScale from './base/ImageScale';
import ImageScaleBy from './base/ImageScaleBy';
import KSampler from './base/KSampler';
import KSamplerAdvanced from './base/KSamplerAdvanced';
import KSamplerSelect from './base/KSamplerSelect';
import LoadImage from './base/LoadImage';
import LoraLoader from './base/LoraLoader';
import LoraLoaderModelOnly from './base/LoraLoaderModelOnly';
import ModelSamplingFlux from './base/ModelSamplingFlux';
import ModelSamplingSD3 from './base/ModelSamplingSD3';
import PreviewImage from './base/PreviewImage';
import PrimitiveStringMultiline from './base/PrimitiveStringMultiline';
import RandomNoise from './base/RandomNoise';
import SamplerCustomAdvanced from './base/SamplerCustomAdvanced';
import SaveImage from './base/SaveImage';
import TextEncodeQwenImageEditPlus from './base/TextEncodeQwenImageEditPlus';
import UNETLoader from './base/UNETLoader';
import VAEDecode from './base/VAEDecode';
import VAEEncode from './base/VAEEncode';
import VAEEncodeForInpaint from './base/VAEEncodeForInpaint';
import VAELoader from './base/VAELoader';
import WanImageToVideo from './base/WanImageToVideo';
import ImageResizeKJv2 from './kj-nodes/ImageResizeKJv2';
import MiniMaxH3Easy from './minimax-h3-easy/MiniMaxH3Easy';
import MiniMaxH3EasyLoader from './minimax-h3-easy/MiniMaxH3EasyLoader';
import MiniMaxH3EasyMediaBridge from './minimax-h3-easy/MiniMaxH3EasyMediaBridge';
import VHS_VideoCombine from './video-helper-suite/VHS_VideoCombine';
import ImmutableNode from '../common/immutable-node';
interface NodeContentProps {
  node: Node;
  serverId: string;
  workflowId: string;
  sharedImageUri?: string;
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
  'CLIPVisionLoader': CLIPVisionLoader,
  'CLIPVisionEncode': CLIPVisionEncode,
  'CLIPLoader': CLIPLoader,
  'PrimitiveStringMultiline': PrimitiveStringMultiline,
  'WanImageToVideo': WanImageToVideo,
  'ModelSamplingSD3': ModelSamplingSD3,
  'VHS_VideoCombine': VHS_VideoCombine,
  'ImageScaleBy': ImageScaleBy,
  'ImageResizeKJv2': ImageResizeKJv2,
  'TextEncodeQwenImageEditPlus': TextEncodeQwenImageEditPlus,
  'GetImageSize': ImmutableNode,

  // ComfyUI-MiniMaxH3-Easy. The remaining four nodes only take links, so they
  // render as plain immutable nodes.
  'MiniMaxH3Easy': MiniMaxH3Easy,
  'MiniMaxH3EasyLoader': MiniMaxH3EasyLoader,
  'MiniMaxH3EasyMediaBridge': MiniMaxH3EasyMediaBridge,
  'MiniMaxH3EasyModelAdapter': ImmutableNode,
  'MiniMaxH3EasyOutput': ImmutableNode,
  'MiniMaxH3EasyAspectRatio': ImmutableNode,
  'MiniMaxH3EasySecondPassConditioning': ImmutableNode,
  // add more node types here
};

// get node component function
export function getNodeComponent(classType: string): ComponentType<NodeContentProps> {
  return nodeComponentMap[classType] || UnknownNode;
} 
