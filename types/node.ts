
export enum NodeType {
  CheckpointLoaderSimple = 'CheckpointLoaderSimple',
  KSampler = 'KSampler',
  CLIPSetLastLayer = 'CLIPSetLastLayer',
  LoraLoaderSimple = 'LoraLoaderSimple',
  Unsupported = 'Unsupported',
}

export interface NodeMeta {
  title?: string;
}

export interface Node {
  id: string; // unique id
  index: number; // index in the node list, integer, but in raw data it's a string
  type: NodeType;
  inputs: Record<string, any>;
  _meta?: NodeMeta;
}