import React from 'react';
import { TouchableOpacity, View, Pressable } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { MotiView } from 'moti';
import { Clock, ImageIcon, Edit2, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { ButtonText } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { EditPresetModal } from '@/components/self-ui/edit-preset-modal';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { usePresetsStore } from '@/store/presets';
import { Heading } from '@/components/ui/heading';
import { Icon } from '@/components/ui/icon';

interface PresetCardProps {
  id: string;
  name: string;
  createdAt: number;
  thumbnail?: string;
  lastUsed?: number;
  params: any;
  onPress: () => void;
  index?: number;
}

export const PresetCard = ({
  id,
  name,
  createdAt,
  thumbnail,
  lastUsed,
  params,
  onPress,
  index = 0,
}: PresetCardProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const removePreset = usePresetsStore((state) => state.removePreset);

  const handleDelete = () => {
    removePreset(id);
    setIsDeleteAlertOpen(false);
  };

  return (
    <>
      <Pressable
        className="active:scale-98 overflow-hidden rounded-xl bg-background-200 active:opacity-80"
        onPress={onPress}
      >
        {/* Top Image Section */}
        <View className="h-64 w-full bg-background-100">
          {thumbnail ? (
            <Image
              source={{ uri: `${thumbnail}?t=${Date.now()}` }}
              className="w-full flex-1"
              alt="Preset thumbnail"
              onError={(error) => {
                console.error('[PresetCard] Failed to load thumbnail:', error);
                // Clear invalid thumbnail
                usePresetsStore
                  .getState()
                  .updatePreset(id, { thumbnail: undefined });
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <ImageIcon size={32} className="text-primary-300" />
            </View>
          )}
        </View>

        {/* Bottom Info Section */}
        <View className="p-3">
          <Text
            className="text-base font-semibold text-primary-500"
            numberOfLines={1}
          >
            {name}
          </Text>

          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs text-primary-400" numberOfLines={1}>
                {params.model || 'No model selected'}
              </Text>
              <Text className="mt-1 text-xs text-primary-400">
                Last used:{' '}
                {lastUsed ? new Date(lastUsed).toLocaleDateString() : 'Never'}
              </Text>
            </View>

            <View className="ml-2 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(true)}
                className="h-8 w-8 items-center justify-center rounded-md bg-background-0 active:bg-background-100"
              >
                <Icon as={Edit2} size="2xs" className="text-accent-500" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsDeleteAlertOpen(true)}
                className="h-8 w-8 items-center justify-center rounded-md bg-background-0 active:bg-background-100"
              >
                <Icon as={Trash2} size="2xs" className="text-error-600" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Pressable>

      <EditPresetModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        preset={{ id, name, createdAt, thumbnail, params }}
      />

      <AlertDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="max-w-md overflow-hidden rounded-xl border-0 bg-background-200">
          <AlertDialogHeader className="px-0">
            <Heading size="sm" className="text-primary-500">
              Delete Preset
            </Heading>
          </AlertDialogHeader>
          <AlertDialogBody className="px-0 py-4">
            <Text className="text-sm text-primary-400">
              Are you sure you want to delete this preset? This action cannot be
              undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter className="px-0">
            <HStack space="sm" className="py-0">
              <Button
                variant="outline"
                onPress={() => setIsDeleteAlertOpen(false)}
                className="flex-1 rounded-md bg-background-100"
              >
                <ButtonText className="text-sm text-primary-400">
                  Cancel
                </ButtonText>
              </Button>
              <Button
                variant="solid"
                onPress={handleDelete}
                className="flex-1 rounded-md bg-error-500 active:bg-error-600"
              >
                <ButtonText className="text-sm text-typography-900">
                  Delete
                </ButtonText>
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
