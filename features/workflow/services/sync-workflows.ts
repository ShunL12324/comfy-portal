import { useServersStore } from '@/features/server/stores/server-store';
import { listWorkflows, getAndConvertWorkflow, WorkflowExtensionUnavailableError } from '@/services/comfy-api';
import { useWorkflowStore } from '../stores/workflow-store';
import { parseWorkflowTemplate } from '../utils/workflow-parser';
import { serverWorkflowFilename } from '../utils/workflow-source';

export interface WorkflowSyncResult {
  state: 'ready' | 'unsupported';
}
const pending = new Map<string, Promise<WorkflowSyncResult>>();
/** Only a successful, complete directory listing can establish source removal. */
export function syncWorkflows(serverId: string): Promise<WorkflowSyncResult> {
  const existing = pending.get(serverId);
  if (existing) return existing;
  const connection = useServersStore.getState().servers.find((server) => server.id === serverId);
  const connected = () => {
    const current = useServersStore.getState().servers.find((server) => server.id === serverId);
    return (
      !!current &&
      current.host === connection?.host &&
      current.port === connection?.port &&
      current.useSSL === connection?.useSSL &&
      current.token === connection?.token
    );
  };
  const request = (async (): Promise<WorkflowSyncResult> => {
    let files;
    try {
      files = await listWorkflows(serverId);
    } catch (error) {
      if (error instanceof WorkflowExtensionUnavailableError) return { state: 'unsupported' };
      throw error;
    }
    if (!connected()) return { state: 'ready' };
    const store = useWorkflowStore.getState();
    store.reconcileServerWorkflows(
      serverId,
      files.map((file) => file.filename),
    );
    const failures: string[] = [];
    for (const file of files) {
      if (!connected()) return { state: 'ready' };
      try {
        const latest = useWorkflowStore.getState();
        if (latest.hiddenServerWorkflows[serverId]?.includes(file.filename)) continue;
        const record = latest.workflow.find(
          (item) => item.serverId === serverId && serverWorkflowFilename(item) === file.filename,
        );
        const observed = record?.metadata;
        if (
          record?.serverSync?.base &&
          observed?.serverFileModified === file.modified &&
          observed.serverFileSize === file.size &&
          observed.raw_content === file.raw_content
        )
          continue;
        const data = parseWorkflowTemplate(await getAndConvertWorkflow(serverId, file.filename));
        if (!Object.keys(data).length) throw new Error('Converted workflow is empty.');
        if (!connected()) return { state: 'ready' };
        // Read current state after the network await: edits and hides may have
        // happened while conversion was in flight.
        useWorkflowStore.getState().receiveServerWorkflow(serverId, file.filename, {
          name:
            file.filename
              .split(/[\\/]/)
              .pop()
              ?.replace(/\.json$/i, '') || file.filename,
          data,
          modified: file.modified,
          size: file.size,
          rawContent: file.raw_content,
        });
      } catch {
        failures.push(file.filename);
      }
    }
    if (failures.length) throw new Error(`Could not sync ${failures.length} workflow(s). Pull to retry.`);
    if (connected())
      useWorkflowStore.getState().reconcileServerWorkflows(
        serverId,
        files.map((file) => file.filename),
        new Date().toISOString(),
      );
    return { state: 'ready' };
  })().finally(() => pending.delete(serverId));
  pending.set(serverId, request);
  return request;
}
