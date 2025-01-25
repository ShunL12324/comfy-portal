import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
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

interface PresetCardProps {
  id: string;
  name: string;
  createdAt: number;
  thumbnail?: string;
  onPress: () => void;
}

export const PresetCard = ({
  id,
  name,
  createdAt,
  thumbnail,
  onPress,
}: PresetCardProps) => {
  const [isPressed, setIsPressed] = React.useState(false);
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
        transition={{ type: 'spring', damping: 15, mass: 0.8 }}
      >
        <Pressable
          onPress={onPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          className="overflow-hidden rounded-2xl bg-background-50/80 backdrop-blur-xl"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          }}
        >
          <MotiView
            animate={{
              scale: isPressed ? 0.97 : 1,
              opacity: isPressed ? 0.95 : 1,
            }}
            transition={{ type: 'timing', duration: 100 }}
          >
            <HStack className="items-center justify-between p-4">
              <HStack space="md" className="flex-1 items-center">
                {thumbnail ? (
                  <Image
                    source={{ uri: thumbnail }}
                    className="h-16 w-16 rounded-2xl"
                    resizeMode="cover"
                    alt={`Thumbnail for ${name}`}
                  />
                ) : (
                  <HStack className="h-16 w-16 items-center justify-center rounded-2xl bg-background-0/80 backdrop-blur-xl">
                    <ImageIcon size={24} className="text-primary-500" />
                  </HStack>
                )}
                <VStack space="xs" className="flex-1">
                  <Text
                    className="text-base font-semibold text-primary-500"
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <HStack space="xs" className="items-center">
                    <Clock size={13} className="text-primary-300" />
                    <Text className="text-xs text-primary-400">
                      {new Date(createdAt).toLocaleString()}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
              <VStack
                space="md"
                className="h-16 items-end justify-between py-0.5"
              >
                <HStack space="sm">
                  <Pressable
                    onPress={() => setIsEditModalOpen(true)}
                    className="h-9 w-9 items-center justify-center rounded-xl bg-background-0/80 backdrop-blur-xl active:bg-background-100/80"
                  >
                    <Edit2 size={14} className="text-primary-500" />
                  </Pressable>
                  <Pressable
                    onPress={() => setIsDeleteAlertOpen(true)}
                    className="h-9 w-9 items-center justify-center rounded-xl bg-background-0/80 backdrop-blur-xl active:bg-background-100/80"
                  >
                    <Trash2 size={14} className="text-error-600" />
                  </Pressable>
                </HStack>
              </VStack>
            </HStack>
          </MotiView>
        </Pressable>
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
        <AlertDialogContent className="rounded-2xl bg-background-0">
          <AlertDialogHeader className="pb-3">
            <Text className="text-lg font-semibold text-primary-500">
              Delete Preset
            </Text>
          </AlertDialogHeader>
          <AlertDialogBody className="pb-4">
            <Text className="text-sm text-primary-400">
              Are you sure you want to delete this preset? This action cannot be
              undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter className="pt-3">
            <HStack space="sm">
              <Button
                variant="outline"
                onPress={() => setIsDeleteAlertOpen(false)}
                className="flex-1 rounded-xl border-[0.5px] border-background-200"
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
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
