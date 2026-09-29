import { Node } from '@/features/workflow/types';
import { ComponentType } from 'react';
import UnknownNode from '../common/unknown-node';
import BasicGuider from './base/basic-guider';
import BasicScheduler from './base/basic-scheduler';
import CheckpointLoaderSimple from './base/checkpoint-loader-simple';
import CLIPLoader from './base/clip-loader';
import CLIPSetLastLayer from './base/clip-set-last-layer';
import CLIPTextEncode from './base/clip-text-encode';
import CLIPTextEncodeSDXL from './base/clip-text-encode-sdxl';
import CLIPVisionEncode from './base/clip-vision-encode';
import CLIPVisionLoader from './base/clip-vision-loader';
import DualCLIPLoader from './base/dual-clip-loader';
import EmptyLatentImage from './base/empty-latent-image';
import EmptySD3LatentImage from './base/empty-sd3-latent-image';
import FluxGuidance from './base/flux-guidance';
import ImagePadForOutpaint from './base/image-pad-for-outpaint';
import ImageScale from './base/image-scale';
import ImageScaleBy from './base/image-scale-by';
import KSampler from './base/k-sampler';
import KSamplerAdvanced from './base/k-sampler-advanced';
import KSamplerSelect from './base/k-sampler-select';
import LoadImage from './base/load-image';
import LoraLoader from './base/lora-loader';
import LoraLoaderModelOnly from './base/lora-loader-model-only';
import ModelSamplingFlux from './base/model-sampling-flux';
import ModelSamplingSD3 from './base/model-sampling-sd3';
import PreviewImage from './base/preview-image';
import PrimitiveStringMultiline from './base/primitive-string-multiline';
import RandomNoise from './base/random-noise';
import SamplerCustomAdvanced from './base/sampler-custom-advanced';
import SaveImage from './base/save-image';
import TextEncodeQwenImageEditPlus from './base/text-encode-qwen-image-edit-plus';
import UNETLoader from './base/unet-loader';
import VAEDecode from './base/vae-decode';
import VAEEncode from './base/vae-encode';
import VAEEncodeForInpaint from './base/vae-encode-for-inpaint';
import VAELoader from './base/vae-loader';
import WanImageToVideo from './base/wan-image-to-video';
import ImageResizeKJv2 from './kj-nodes/image-resize-kjv2';
import MiniMaxH3Easy from './minimax-h3-easy/minimax-h3-easy';
import MiniMaxH3EasyLoader from './minimax-h3-easy/minimax-h3-easy-loader';
import MiniMaxH3EasyMediaBridge from './minimax-h3-easy/minimax-h3-easy-media-bridge';
import VHS_VideoCombine from './video-helper-suite/vhs-video-combine';
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
