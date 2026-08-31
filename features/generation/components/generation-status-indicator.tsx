import { StatusPill, type StatusTone } from '@/components/self-ui/status-pill';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Props for the ServerStatus component
 */
interface ServerStatusProps {
  /** Whether the server is currently generating media */
  generating: boolean;
  /** Whether the server is currently downloading media */
  downloading?: boolean;
  /** Download progress percentage (0-100) */
  downloadProgress?: number;
  /** Generation progress information */
  generationProgress?: {
    value: number;
    max: number;
  };
  /** Node execution progress */
  nodeProgress?: {
    completed: number;
    total: number;
  };
  /** Server name to display */
  name: string;
}

/**
 * Displays the current server status with visual indicators
 * Shows different states:
 * - Ready (green)
 * - Generating with progress (yellow)
 * - Downloading with progress (blue)
 */
export function ServerStatus({
  generating,
  downloading = false,
  downloadProgress = 0,
  generationProgress,
  nodeProgress,
  name,
}: ServerStatusProps) {
  let tone: StatusTone = 'ready';
  let status = 'Ready';

  if (generating) {
    tone = 'busy';
    const hasProgress = generationProgress && generationProgress.max > 0;
    const hasNodes = nodeProgress && nodeProgress.total > 0;
    const progressPct = hasProgress
      ? `${Math.round((generationProgress.value / generationProgress.max) * 100)}%`
      : '';
    const nodePart = hasNodes
      ? `(${nodeProgress.completed}/${nodeProgress.total})`
      : '';

    if (progressPct && nodePart) {
      status = `Generating ${progressPct} ${nodePart}`;
    } else if (progressPct) {
      status = `Generating ${progressPct}`;
    } else if (nodePart) {
      status = `Generating ${nodePart}`;
    } else {
      status = 'Generating';
    }
  } else if (downloading) {
    tone = 'downloading';
    status = `Downloading ${Math.round(downloadProgress)}%`;
  }

  return (
    <VStack space="sm" className="items-center">
      {/* The primary scale is the interactive colour, not a text ramp. This is
          a subordinate label, so it takes the secondary text role. */}
      <Text className="text-xs text-content-secondary">{name}</Text>
      <StatusPill tone={tone} pulse={generating || downloading}>
        {status}
      </StatusPill>
    </VStack>
  );
}
