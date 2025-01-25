import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { VStack } from '../ui/vstack';

interface ServerStatusProps {
  generating: boolean;
  name: string;
}

export function ServerStatus({ generating, name }: ServerStatusProps) {
  const color = generating ? 'warning' : 'success';

  return (
    <VStack space="sm" className="items-center">
      <Text className="text-xs text-primary-300">{name}</Text>
      <Box
        className={`rounded-full bg-${color}-100 dark:bg-${color}-900/30 p-0.2`}
      >
        <Box className={`flex-row items-center rounded-full px-2 py-0.5`}>
          <Box className={`mr-1 h-1.5 w-1.5 rounded-full bg-${color}-500`}>
            {generating && (
              <Box
                className={`absolute h-1.5 w-1.5 rounded-full bg-${color}-500 animate-ping`}
              />
            )}
          </Box>
          <Text
            className={`text-2xs font-medium text-${color}-700 dark:text-${color}-300`}
          >
            {generating ? 'Generating' : 'Ready'}
          </Text>
        </Box>
      </Box>
    </VStack>
  );
}
