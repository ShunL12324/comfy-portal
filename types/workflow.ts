export interface Node {
  id: string;
  inputs: Record<string, any>;
  class_type: string;
  _meta: Partial<{
    title: string;
    [key: string]: any;
  }> | undefined;
}

export interface Workflow {
  [key: string]: Node;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  serverId: string;
  data: Workflow;
  addMethod: 'file' | 'clipboard' | 'url' | 'preset';
  thumbnail?: string;
  createdAt: Date;
  lastUsed?: Date;
}




