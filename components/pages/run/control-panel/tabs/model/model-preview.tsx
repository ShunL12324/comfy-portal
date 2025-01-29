import React from 'react';
import { Image } from '@/components/ui/image';
import { View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Image as ImageIcon } from 'lucide-react-native';
import { Model } from '@/types/server';

interface ModelPreviewProps {
  model: Model;
}

export function ModelPreview({ model }: ModelPreviewProps) {
  if (!model.hasPreview || !model.previewPath) {
    return (
      <Box className="h-12 w-12 items-center justify-center rounded-lg border-[0.5px] border-background-100 bg-background-50">
        <Icon as={ImageIcon} size="sm" className="text-primary-300" />
      </Box>
    );
  }

  // Add file:// prefix for local files
  const imageUri = model.previewPath.startsWith('file://')
    ? model.previewPath
    : `file://${model.previewPath}`;

  return (
    <Image
      source={{ uri: imageUri }}
      alt={model.name}
      className="h-12 w-12 rounded-lg"
      resizeMode="cover"
      onError={(error) => {
        console.error('[ModelPreview] Failed to load image:', imageUri, error);
      }}
    />
  );
}
