import React, { useState } from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
} from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { Input, InputField } from '@/components/ui/input';
import { usePresetsStore } from '@/store/presets';
import { ButtonText } from '@/components/ui/button';
import { Keyboard, Platform, Animated } from 'react-native';
import { View } from '@/components/ui/view';
import { FormControl } from '@/components/ui/form-control';
import { FormControlLabel } from '@/components/ui/form-control';
import { FormControlError } from '@/components/ui/form-control';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { ImagePlus } from 'lucide-react-native';
import { GenerationParams } from '@/types/generation';

interface EditPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: {
    id: string;
    name: string;
    createdAt: number;
    thumbnail?: string;
    params: GenerationParams;
  };
}

export function EditPresetModal({
  isOpen,
  onClose,
  preset,
}: EditPresetModalProps) {
  const [name, setName] = useState(preset.name);
  const [thumbnail, setThumbnail] = useState(preset.thumbnail || '');
  const [error, setError] = useState('');
  const updatePreset = usePresetsStore((state) => state.updatePreset);
  const translateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardWillShow', () => {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [translateY]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    let finalThumbnail = thumbnail;
    if (thumbnail && thumbnail !== preset.thumbnail) {
      const ext = thumbnail.split('.').pop();
      const newPath = `${FileSystem.documentDirectory}presets/${preset.id}/thumbnail.${ext}`;

      try {
        // Create directories if they don't exist
        await FileSystem.makeDirectoryAsync(
          `${FileSystem.documentDirectory}presets/${preset.id}`,
          { intermediates: true },
        );

        // Copy the file
        await FileSystem.copyAsync({
          from: thumbnail,
          to: newPath,
        });

        finalThumbnail = newPath;
      } catch (error) {
        console.error('Failed to save thumbnail:', error);
      }
    }

    updatePreset(preset.id, {
      name: name.trim(),
      thumbnail: finalThumbnail,
      params: preset.params,
    });

    handleClose();
  };

  const handleSelectImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setThumbnail(result.assets[0].uri);
    }
  };

  const handleClose = () => {
    setName(preset.name);
    setThumbnail(preset.thumbnail || '');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closeOnOverlayClick>
      <ModalBackdrop onPress={handleClose} />
      <Animated.View
        style={[
          {
            width: '100%',
            transform: [{ translateY }],
          },
        ]}
        className="flex-1 items-center justify-center px-5"
        pointerEvents="box-none"
      >
        <ModalContent className="overflow-hidden rounded-xl border-0 bg-background-200">
          <ModalHeader>
            <Text className="text-lg font-semibold text-primary-500">
              Edit Preset
            </Text>
          </ModalHeader>

          <ModalBody>
            <VStack space="md">
              <FormControl isInvalid={!!error}>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-primary-400">
                    Name
                  </Text>
                </FormControlLabel>
                <Input
                  variant="outline"
                  size="md"
                  className="mt-1 overflow-hidden rounded-md border-0 bg-background-0"
                >
                  <InputField
                    onChangeText={(value) => {
                      setName(value);
                      setError('');
                    }}
                    value={name}
                    placeholder="Enter preset name"
                    className="px-3 py-2 text-sm text-primary-500 placeholder:text-primary-300"
                  />
                </Input>
                {error && (
                  <FormControlError>
                    <Text className="mt-1.5 text-xs text-error-600">
                      {error}
                    </Text>
                  </FormControlError>
                )}
              </FormControl>

              <VStack space="xs">
                <Text className="text-sm font-medium text-primary-400">
                  Thumbnail (Optional)
                </Text>
                <Pressable
                  onPress={handleSelectImage}
                  className="overflow-hidden rounded-md border-0 bg-background-0"
                >
                  {thumbnail ? (
                    <Image
                      source={{ uri: thumbnail }}
                      className="h-32 w-full"
                      resizeMode="cover"
                      alt="Preset thumbnail"
                    />
                  ) : (
                    <VStack className="h-32 items-center justify-center">
                      <ImagePlus className="text-primary-300" />
                      <Text className="mt-2 text-sm text-primary-300">
                        Add thumbnail
                      </Text>
                    </VStack>
                  )}
                </Pressable>
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              onPress={handleClose}
              className="mr-3 flex-1 rounded-md border-0 bg-background-100"
            >
              <ButtonText className="text-primary-400">Cancel</ButtonText>
            </Button>
            <Button
              variant="solid"
              action="primary"
              onPress={handleUpdate}
              className="flex-1 rounded-md border-0 bg-primary-500"
              disabled={!name.trim()}
            >
              <ButtonText className="text-background-0">Save</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Animated.View>
    </Modal>
  );
}
