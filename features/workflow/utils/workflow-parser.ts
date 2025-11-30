import { type Node, type Workflow } from "@/features/workflow/types";

/**
 * Parse a JSON template into a Workflow type
 * @param template - The JSON template to parse
 * @returns A Workflow object
 */
export function parseWorkflowTemplate(template: Record<string, any>): Workflow {
  const workflow: Workflow = {};

  for (const [nodeId, nodeData] of Object.entries(template)) {
    if (typeof nodeData !== 'object' || nodeData === null) {
      throw new Error(`Invalid node data for node ${nodeId}`);
    }

    const node: Node = {
      id: nodeId,
      inputs: nodeData.inputs || {},
      class_type: nodeData.class_type || '',
      _meta: nodeData._meta,
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
