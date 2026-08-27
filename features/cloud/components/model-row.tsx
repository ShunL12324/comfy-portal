import { OptionSelector } from '@/components/common/selectors/option-selector';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import type { TemplateModel } from '@/features/cloud/types';
import { formatBytes, MODEL_TYPES } from '@/services/model-url';
import { Trash2 } from 'lucide-react-native';
import React from 'react';

const TYPE_OPTIONS = MODEL_TYPES.map((t) => ({ value: t, label: t }));

export function ModelRow({
  model,
  onChangeType,
  onRemove,
}: {
  model: TemplateModel;
  onChangeType: (type: string) => void;
  onRemove: () => void;
}) {
  return (
    <View className="rounded-xl bg-background-50 p-3">
      <HStack className="items-start justify-between">
        <VStack className="flex-1 pr-2" space="xs">
          <Text className="text-sm font-medium text-typography-900" numberOfLines={1}>
            {model.label || model.filename || model.url}
          </Text>
          <Text className="text-xs text-typography-400" numberOfLines={1}>
            {[model.filename, formatBytes(model.sizeBytes)].filter(Boolean).join(' · ') || model.url}
          </Text>
        </VStack>
        <Pressable onPress={onRemove} className="p-1">
          <Icon as={Trash2} size="xs" className="text-error-400" />
        </Pressable>
      </HStack>

      <View className="mt-2">
        {/* The folder decides whether ComfyUI can see the file at all, so it's
            an explicit control rather than something inferred and hidden. */}
        <OptionSelector
          value={model.type}
          onChange={onChangeType}
          options={TYPE_OPTIONS}
          title="Model folder"
        />
      </View>
    </View>
  );
}
