export interface QuickAction {
  id: string;
  name: string;
  serverId: string;
  workflowId: string;
  /** The node ID of the LoadImage node to receive the shared image */
  targetNodeId: string;
  /** Unix timestamp in milliseconds */
  createdAt: number;
}
