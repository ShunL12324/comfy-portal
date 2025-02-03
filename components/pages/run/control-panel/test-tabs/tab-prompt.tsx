import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { usePresetsStore } from '@/store/presets';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
interface TabPromptProps {
  serverId: string;
  presetId: string;
}

export default function TabPrompt({ serverId, presetId }: TabPromptProps) {
  const [positive, setPositive] = useState('');
  const [negative, setNegative] = useState('');

  // data
  const preset = usePresetsStore((state) =>
    state.presets.find((p) => p.id === presetId),
  );

  // actions
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  // monitor changes
  useEffect(() => {
    if (!preset?.params) return;
    updatePreset(presetId, {
      params: { ...preset?.params, prompt: positive, negativePrompt: negative },
    });
  }, [positive, negative]);

  return (
    <ScrollView
      className="flex-1 bg-background-0"
      contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 48 }}
    >
      <View className="flex-row items-center justify-between">
        <Text size="sm" bold>
          Positive Prompt
        </Text>
      </View>
      <Textarea
        size="sm"
        isReadOnly={false}
        isInvalid={false}
        isDisabled={false}
        className="w-full rounded-md border-0 bg-background-100"
      >
        <TextareaInput
          placeholder="Positive prompt goes here..."
          value={positive}
          onChangeText={setPositive}
        />
      </Textarea>
      <View className="flex-row items-center justify-between pt-2">
        <Text size="sm" bold>
          Negative Prompt
        </Text>
      </View>
      <Textarea
        size="sm"
        isReadOnly={false}
        isInvalid={false}
        isDisabled={false}
        className="w-full rounded-md border-0 bg-background-100"
      >
        <TextareaInput
          placeholder="Negative prompt goes here..."
          value={negative}
          onChangeText={setNegative}
        />
      </Textarea>
    </ScrollView>
  );
}
