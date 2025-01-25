import React, { useState, useCallback } from 'react';
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
} from '@/components/ui/drawer';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Image } from '@/components/ui/image';
import { ScrollView } from '@/components/ui/scroll-view';
import { Pressable } from '@/components/ui/pressable';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import {
  Settings2,
  Trash2,
  Check,
  CheckSquare,
  MinusSquare,
  PlusSquare,
} from 'lucide-react-native';
import { Box } from '@/components/ui/box';
import { MotiView } from 'moti';
import { View } from '@/components/ui/view';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{
    url: string;
    timestamp: number;
  }>;
  onSelectImage?: (url: string) => void;
  onDeleteImages?: (urls: string[]) => void;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  images,
  onSelectImage,
  onDeleteImages,
}: HistoryDrawerProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Reset edit mode when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setIsEditMode(false);
      setSelectedImages([]);
    }
  }, [isOpen]);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(!isEditMode);
    setSelectedImages([]);
  }, [isEditMode]);

  const handleToggleSelect = useCallback((url: string) => {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedImages((prev) =>
      prev.length === images.length ? [] : images.map((img) => img.url),
    );
  }, [images]);

  const handleDelete = useCallback(() => {
    if (selectedImages.length > 0 && onDeleteImages) {
      onDeleteImages(selectedImages);
      setSelectedImages([]);
      setIsEditMode(false);
    }
  }, [selectedImages, onDeleteImages]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="right">
      <DrawerBackdrop />
      <DrawerContent className="relative p-0">
        <DrawerHeader className="border-b-[0.5px] border-b-background-100 px-4">
          <View className="flex-row items-center py-3">
            <View className="flex-1">
              <Text className="text-xl font-medium text-background-800">
                History
              </Text>
            </View>
            <Button
              variant="link"
              size="sm"
              onPress={handleToggleEditMode}
              className="h-8 w-[88px] items-center justify-center overflow-hidden rounded-lg border-[0.5px] border-background-100 bg-background-0"
            >
              <MotiView
                animate={{
                  translateY: isEditMode ? 0 : -20,
                  opacity: isEditMode ? 1 : 0,
                }}
                transition={{
                  type: 'timing',
                  duration: 200,
                }}
                className="absolute"
              >
                <HStack space="xs" className="items-center">
                  <Icon as={Check} size="sm" className="text-primary-500" />
                  <Text className="text-sm font-medium text-primary-500">
                    Done
                  </Text>
                </HStack>
              </MotiView>
              <MotiView
                animate={{
                  translateY: isEditMode ? 20 : 0,
                  opacity: isEditMode ? 0 : 1,
                }}
                transition={{
                  type: 'timing',
                  duration: 200,
                }}
                className="absolute"
              >
                <HStack space="xs" className="items-center">
                  <Icon as={Settings2} size="sm" className="text-primary-500" />
                  <Text className="text-sm font-medium text-primary-500">
                    Edit
                  </Text>
                </HStack>
              </MotiView>
            </Button>
          </View>
        </DrawerHeader>
        <DrawerBody className="flex-1 px-4 pb-0">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            <VStack space="sm">
              {images.map((image, index) => (
                <Pressable
                  key={index}
                  onPress={() =>
                    isEditMode
                      ? handleToggleSelect(image.url)
                      : onSelectImage?.(image.url)
                  }
                  className="relative"
                >
                  <Box className="h-48 overflow-hidden rounded-xl border-[0.5px] border-background-100">
                    <Image
                      source={{ uri: image.url }}
                      alt={`Generated image ${index + 1}`}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </Box>
                  {isEditMode && (
                    <MotiView
                      from={{
                        opacity: 0,
                        scale: 0.8,
                      }}
                      animate={{
                        opacity: selectedImages.includes(image.url) ? 1 : 0,
                        scale: selectedImages.includes(image.url) ? 1 : 0.8,
                      }}
                      transition={{
                        type: 'spring',
                        damping: 20,
                        stiffness: 300,
                      }}
                      className="absolute right-2 top-2 rounded-full bg-primary-500 p-1.5 shadow-sm"
                    >
                      <Icon
                        as={Check}
                        size="sm"
                        className="text-background-0"
                      />
                    </MotiView>
                  )}
                </Pressable>
              ))}
            </VStack>
          </ScrollView>
        </DrawerBody>
        <MotiView
          animate={{
            translateY: isEditMode ? 0 : 200,
            opacity: isEditMode ? 1 : 0,
          }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 300,
          }}
          className="absolute bottom-0 left-0 right-0 border-t-[0.5px] border-t-background-100 bg-background-0 px-4 py-4"
        >
          <VStack space="sm">
            <Text className="text-sm text-background-400">
              {selectedImages.length} selected
            </Text>
            <Button
              variant="outline"
              size="lg"
              onPress={handleSelectAll}
              className="h-12 w-full justify-start border-background-100 px-4"
            >
              <Icon
                as={
                  selectedImages.length === images.length
                    ? MinusSquare
                    : PlusSquare
                }
                size="sm"
                className="mr-2 text-primary-500"
              />
              <Text className="text-sm text-primary-500">
                {selectedImages.length === images.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onPress={handleDelete}
              isDisabled={selectedImages.length === 0}
              className="h-12 w-full justify-start border-background-100 px-4"
            >
              <Icon as={Trash2} size="sm" className="mr-2 text-error-500" />
              <Text className="text-sm text-error-500">Delete Selected</Text>
            </Button>
          </VStack>
        </MotiView>
      </DrawerContent>
    </Drawer>
  );
}
