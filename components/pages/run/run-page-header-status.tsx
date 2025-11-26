import { useGenerationProgress, useGenerationStatus } from '@/context/generation-context';
import { ServerStatus } from './generation-status-indicator';

interface RunPageHeaderStatusProps {
  serverName: string;
}

export function RunPageHeaderStatus({ serverName }: RunPageHeaderStatusProps) {
  const { status } = useGenerationStatus();
  const { progress, downloadProgress } = useGenerationProgress();

  return (
    <ServerStatus
      generating={status === 'generating'}
      downloading={status === 'downloading'}
      downloadProgress={downloadProgress}
      generationProgress={progress}
      name={serverName}
    />
  );
}
