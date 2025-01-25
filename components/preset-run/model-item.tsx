import React from 'react';
import { Image } from '@/components/ui/image';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  Image as ImageIcon,
  Check,
  Server,
  FileType,
} from 'lucide-react-native';
import { Model } from '@/types/server';

interface ModelItemProps {
  model: Model;
  serverName: string;
  isSelected?: boolean;
}

export function ModelItem({ model, serverName, isSelected }: ModelItemProps) {
  const getFileExtension = (filename: string) => {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toUpperCase() : '';
  };

  const getModelNameWithoutExtension = (filename: string) => {
    return filename.replace(/\.[^/.]+$/, '');
  };

  const renderPreview = () => {
    if (!model.hasPreview || !model.previewPath) {
      return (
        <Box className="aspect-square w-full items-center justify-center rounded-xl border-[0.5px] border-background-100 bg-background-50">
          <Icon as={ImageIcon} size="sm" className="text-primary-300" />
        </Box>
      );
    }

    const imageUri = model.previewPath.startsWith('file://')
      ? model.previewPath
      : `file://${model.previewPath}`;

    return (
      <Box className="aspect-square w-full overflow-hidden rounded-xl border-[0.5px] border-background-100">
        <Image
          source={{ uri: imageUri }}
          alt={model.name}
          className="h-full w-full"
          resizeMode="cover"
        />
      </Box>
    );
  };

  const modelName = getModelNameWithoutExtension(model.name);
  // 如果文本不够长，添加换行符确保两行显示
  const displayName = modelName.length < 20 ? modelName + '\n ' : modelName;

  return (
    <VStack space="sm" className="relative">
      <Box className="relative">
        {renderPreview()}
        {isSelected && (
          <Box className="absolute right-2 top-2 rounded-full bg-primary-500 p-1 shadow-sm">
            <Icon as={Check} size="sm" className="text-background-0" />
          </Box>
        )}
      </Box>
      <VStack space="xs" className="px-1">
        <Box className="h-12">
          <Text
            className="text-sm font-medium leading-6 text-primary-500"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {displayName}
          </Text>
        </Box>
        <HStack space="xs" className="items-center justify-between">
          <HStack space="xs" className="flex-1 items-center">
            <Icon as={Server} size="xs" className="text-background-400" />
            <Text
              className="text-xs text-background-400"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {serverName}
            </Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <Icon as={FileType} size="xs" className="text-background-400" />
            <Text className="text-xs font-medium text-background-400">
              {getFileExtension(model.name)}
            </Text>
          </HStack>
        </HStack>
      </VStack>
    </VStack>
  );
}
