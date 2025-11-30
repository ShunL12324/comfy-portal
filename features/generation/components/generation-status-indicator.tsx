import { Box } from '@/components/ui/box';
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
  name,
}: ServerStatusProps) {
  let color = 'success';
  let status = 'Ready';

  if (generating) {
    color = 'warning';
    if (generationProgress) {
      const progress = Math.round((generationProgress.value / generationProgress.max) * 100) || 0;
      status = `Generating ${progress}%`;
    } else {
      status = 'Generating';
    }
  } else if (downloading) {
    color = 'info';
    status = `Downloading ${Math.round(downloadProgress)}%`;
  }

  return (
    <VStack space="sm" className="items-center">
      <Text className="text-xs text-primary-300">{name}</Text>
      <Box className={`rounded-full bg-${color}-100 dark:bg-${color}-900/30 p-0.2`}>
        <Box className={`flex-row items-center rounded-full px-2 py-0.5`}>
          <Box className={`mr-1 h-1.5 w-1.5 rounded-full bg-${color}-500`}>
            {(generating || downloading) && (
              <Box className={`absolute h-1.5 w-1.5 rounded-full bg-${color}-500`} />
            )}
          </Box>
          <Text className={`text-2xs font-medium text-${color}-700 dark:text-${color}-300`}>{status}</Text>
        </Box>
      </Box>
    </VStack>
  );
}
