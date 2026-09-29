import { type Node, type Workflow } from '@/features/workflow/types';

/**
 * Parse a JSON template into a Workflow type
 * @param template - The JSON template to parse
 * @returns A Workflow object
 */
export function parseWorkflowTemplate(template: Record<string, any>): Workflow {
  if (!template || typeof template !== 'object' || Array.isArray(template)) {
    throw new Error('Workflow must be an object keyed by node id.');
  }
  const workflow: Workflow = {};

  for (const [nodeId, nodeData] of Object.entries(template)) {
    if (typeof nodeData !== 'object' || nodeData === null || Array.isArray(nodeData)) {
      throw new Error(`Invalid node data for node ${nodeId}`);
    }

    if (typeof nodeData.class_type !== 'string' || !nodeData.class_type.trim()) {
      throw new Error('Workflow node ' + nodeId + ' has no class type.');
    }
    if (nodeData.inputs != null && (typeof nodeData.inputs !== 'object' || Array.isArray(nodeData.inputs))) {
      throw new Error('Workflow node ' + nodeId + ' has invalid inputs.');
    }
    const node: Node = {
      id: nodeId,
      inputs: JSON.parse(JSON.stringify(nodeData.inputs || {})),
      class_type: nodeData.class_type || '',
      _meta: nodeData._meta ? JSON.parse(JSON.stringify(nodeData._meta)) : undefined,
    };

    workflow[nodeId] = node;
  }

  return workflow;
}

/**
 * Convert a Workflow object back to JSON format
 * @param workflow - The Workflow object to convert
 * @returns A JSON representation of the workflow
 */
export function workflowToJson(workflow: Workflow): Record<string, any> {
  const json: Record<string, any> = {};

  for (const [nodeId, node] of Object.entries(workflow)) {
    json[nodeId] = {
      inputs: node.inputs,
      class_type: node.class_type,
      _meta: node._meta,
    };
  }

  return json;
}
