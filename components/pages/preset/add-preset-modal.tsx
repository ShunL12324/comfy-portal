import { Button, ButtonText } from '@/components/ui/button';
import {
  FormControl,
  FormControlError,
  FormControlLabel,
} from '@/components/ui/form-control';
import { Image } from '@/components/ui/image';
import { Input, InputField } from '@/components/ui/input';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { usePresetsStore } from '@/store/presets';
import { GenerationParams } from '@/types/generation';
import { savePresetThumbnail } from '@/utils/image-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Animated, Keyboard } from 'react-native';

interface AddPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

export function AddPresetModal({
  isOpen,
  onClose,
  serverId,
}: AddPresetModalProps) {
  const [name, setName] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [error, setError] = useState('');
  const addPreset = usePresetsStore((state) => state.addPreset);
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

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const presetId = Crypto.randomUUID();
    let finalThumbnail = '';
    if (thumbnail) {
      const ext = thumbnail.split('.').pop();
      const newPath = `${FileSystem.documentDirectory}presets/${presetId}/thumbnail.${ext}`;

      try {
        // Create directories if they don't exist
        await FileSystem.makeDirectoryAsync(
          `${FileSystem.documentDirectory}presets/${presetId}`,
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

    const DEFAULT_PARAMS: GenerationParams = {
      model: 'everclearPNYByZovya_v3.safetensors',
      prompt: '',
      negativePrompt: '',
      steps: 30,
      cfg: 7,
      seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
      width: 768,
      height: 1024,
      sampler: 'dpmpp_3m_sde_gpu',
      scheduler: 'sgm_uniform',
      useRandomSeed: true,
    };

    addPreset({
      name: name.trim(),
      serverId,
      params: DEFAULT_PARAMS,
      thumbnail: finalThumbnail,
    });

    setName('');
    setThumbnail('');
    setError('');
    onClose();
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
      try {
        const tempId = await Crypto.randomUUID();
        const savedImage = await savePresetThumbnail({
          serverId,
          presetId: tempId,
          imageUri: result.assets[0].uri,
          mimeType: result.assets[0].mimeType,
        });

        if (savedImage) {
          const localImageUri = savedImage.path.startsWith('file://')
            ? savedImage.path
            : `file://${savedImage.path}`;
          setThumbnail(localImageUri);
        }
      } catch (error) {
        console.error('Failed to save thumbnail:', error);
        alert('Failed to save image. Please try again.');
      }
    }
  };

  const handleClose = () => {
    setName('');
    setThumbnail('');
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
        <ModalContent className="max-w-md overflow-hidden rounded-xl border-0 bg-background-200">
          <ModalHeader>
            <Text className="text-lg font-semibold text-primary-500">
              Add Preset
            </Text>
          </ModalHeader>

          <ModalBody scrollEnabled={false}>
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
              onPress={handleClose}
              className="mr-3 flex-1 rounded-md border-0 bg-background-100"
            >
              <ButtonText className="text-primary-400">Cancel</ButtonText>
            </Button>
            <Button
              variant="solid"
              onPress={handleAdd}
              className="flex-1 rounded-md border-0 bg-primary-500"
              disabled={!name.trim()}
            >
              <ButtonText className="text-background-0">Add</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Animated.View>
    </Modal>
  );
}
