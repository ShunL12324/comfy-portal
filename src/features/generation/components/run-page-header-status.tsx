import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useGenerationProgress, useGenerationStatus } from '@/features/generation/context/generation-context';
import { ServerStatus } from './generation-status-indicator';

interface RunPageHeaderStatusProps {
  workflowId: string;
}

export function RunPageHeaderStatus({ workflowId }: RunPageHeaderStatusProps) {
  const { status, currentNodeId } = useGenerationStatus();
  const currentNodeName = useWorkflowStore((state) =>
    currentNodeId ? state.workflow.find((item) => item.id === workflowId)?.data[currentNodeId]?.class_type : undefined,
  );
  const { progress, downloadProgress, nodeProgress } = useGenerationProgress();

  return (
    <ServerStatus
      generating={status === 'generating'}
      downloading={status === 'downloading'}
      downloadProgress={downloadProgress}
      generationProgress={progress}
      nodeProgress={nodeProgress}
      currentNodeId={currentNodeId}
      currentNodeName={currentNodeName}
    />
  );
}
