import React from 'react';
import { TouchableOpacity } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { MotiView } from 'moti';
import { Clock, ImageIcon, Edit2, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { ButtonText } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { EditPresetModal } from '@/components/edit-preset-modal';
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

interface PresetCardProps {
  id: string;
  name: string;
  createdAt: number;
  thumbnail?: string;
  onPress: () => void;
  index?: number;
}

export const PresetCard = ({
  id,
  name,
  createdAt,
  thumbnail,
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
      <MotiView
        from={{ opacity: 0, scale: 0.98, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 300,
          delay: index * 100,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          className="overflow-hidden rounded-xl bg-background-50"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 15,
          }}
        >
          <HStack className="items-center justify-between p-3.5">
            <HStack space="md" className="flex-1 items-center">
              {thumbnail ? (
                <Image
                  source={{ uri: thumbnail }}
                  className="h-14 w-14 rounded-xl"
                  resizeMode="cover"
                  alt={`Thumbnail for ${name}`}
                />
              ) : (
                <HStack className="h-14 w-14 items-center justify-center rounded-xl bg-background-0">
                  <ImageIcon size={22} className="text-primary-500" />
                </HStack>
              )}
              <VStack space="xs" className="min-w-0 flex-1">
                <Text
                  className="text-base font-semibold text-primary-500"
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <HStack space="xs" className="items-center">
                  <Clock size={12} className="shrink-0 text-primary-300" />
                  <Text className="text-xs text-primary-400" numberOfLines={1}>
                    {new Date(createdAt).toLocaleString()}
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            <VStack space="md" className="ml-4 shrink-0 py-1">
              <HStack space="sm" className="mb-auto">
                <TouchableOpacity
                  onPress={() => setIsEditModalOpen(true)}
                  className="h-8 w-8 items-center justify-center rounded-lg bg-background-0 active:bg-background-100"
                >
                  <Edit2 size={13} className="text-primary-500" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsDeleteAlertOpen(true)}
                  className="h-8 w-8 items-center justify-center rounded-lg bg-background-0 active:bg-background-100"
                >
                  <Trash2 size={13} className="text-error-600" />
                </TouchableOpacity>
              </HStack>
            </VStack>
          </HStack>
        </TouchableOpacity>
      </MotiView>

      <EditPresetModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        preset={{ id, name, createdAt, thumbnail }}
      />

      <AlertDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="rounded-xl bg-background-0">
          <AlertDialogHeader>
            <Heading size="sm">Delete Preset</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-sm text-primary-400">
              Are you sure you want to delete this preset? This action cannot be
              undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onPress={() => setIsDeleteAlertOpen(false)}
              className="flex-1 rounded-xl bg-background-50"
            >
              <ButtonText className="text-primary-400">Cancel</ButtonText>
            </Button>
            <Button
              variant="solid"
              onPress={handleDelete}
              className="flex-1 rounded-xl bg-error-500 active:bg-error-600"
            >
              <ButtonText className="text-background-0">Delete</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
