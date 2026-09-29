export interface Node {
  id: string;
  inputs: Record<string, any>;
  class_type: string;
  _meta:
    | Partial<{
        title: string;
        [key: string]: any;
      }>
    | undefined;
}

export interface Workflow {
  [key: string]: Node;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  serverId: string;
  data: Workflow;
  addMethod: 'file' | 'clipboard' | 'url' | 'preset' | 'server-sync';
  thumbnail?: string;
  createdAt: Date;
  lastUsed?: Date;
  metadata?: Record<string, any>;
  serverSync?: ServerWorkflowSync;
}

export interface ServerWorkflowSnapshot {
  name: string;
  data: Workflow;
  modified: number;
  size: number;
  rawContent?: string;
}

/** Server original and incoming update never replace the editable graph implicitly. */
export interface ServerWorkflowSync {
  filename: string;
  base?: ServerWorkflowSnapshot;
  incoming?: ServerWorkflowSnapshot;
  sourceMissing?: boolean;
}

/** Reusable content, independent of the server connection that first supplied it. */
export interface WorkflowAsset {
  id: string;
  name: string;
  data: Workflow;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

/** A runnable server binding. Copies use their own asset to keep inputs independent. */
export interface WorkflowBinding {
  id: string;
  assetId: string;
  serverId: string;
  addMethod: WorkflowRecord['addMethod'];
  lastUsed?: string;
  metadata?: WorkflowRecord['metadata'];
  serverSync?: ServerWorkflowSync;
}
