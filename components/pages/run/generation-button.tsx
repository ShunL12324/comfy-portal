import { VStack } from '@/components/ui/vstack';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Wand2 } from 'lucide-react-native';

interface GenerationButtonProps {
  onGenerate: () => void;
  isGenerating: boolean;
  isServerOnline: boolean;
}

export function GenerationButton({
  onGenerate,
  isGenerating,
  isServerOnline,
}: GenerationButtonProps) {
  return (
    <VStack className="absolute bottom-0 left-0 right-0 border-t-[0.5px] border-background-100 bg-background-0 px-5 pb-6 pt-4">
      <Button
        size="xl"
        variant="solid"
        action="primary"
        onPress={onGenerate}
        disabled={isGenerating || !isServerOnline}
        className="rounded-xl bg-primary-500 active:bg-primary-600 disabled:opacity-50"
      >
        <Icon as={Wand2} size="sm" className="mr-2 text-background-0" />
        <Text className="font-medium text-background-0">
          {isGenerating ? 'Generating...' : 'Generate'}
        </Text>
      </Button>
    </VStack>
  );
}
