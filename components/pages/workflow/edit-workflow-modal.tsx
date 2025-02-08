import { Button, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlError, FormControlLabel } from '@/components/ui/form-control';
import { Image } from '@/components/ui/image';
import { Input, InputField } from '@/components/ui/input';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/store/workflow';
import { saveWorkflowThumbnail } from '@/utils/image-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Animated, Keyboard } from 'react-native';

interface EditWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
}

export function EditWorkflowModal({ isOpen, onClose, workflowId }: EditWorkflowModalProps) {
  const workflow = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const [name, setName] = useState(workflow?.name || '');
  const [thumbnail, setThumbnail] = useState(workflow?.thumbnail || '');
  const [error, setError] = useState('');
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);
  const translateY = React.useRef(new Animated.Value(0)).current;

  if (!workflow) return null;

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
    if (thumbnail && thumbnail !== workflow.thumbnail) {
      const ext = thumbnail.split('.').pop();
      const newPath = `${FileSystem.documentDirectory}workflows/${workflow.id}/thumbnail.${ext}`;

      try {
        // Create directories if they don't exist
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}workflows/${workflow.id}`, {
          intermediates: true,
        });

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

    updateWorkflow(workflow.id, {
      name: name.trim(),
      thumbnail: finalThumbnail,
      data: workflow.data,
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

    if (!result.canceled && workflow) {
      try {
        const savedImage = await saveWorkflowThumbnail({
          serverId: workflow.serverId,
          workflowId: workflow.id,
          imageUri: result.assets[0].uri,
          mimeType: result.assets[0].mimeType,
        });

        if (savedImage) {
          const localImageUri = savedImage.path.startsWith('file://') ? savedImage.path : `file://${savedImage.path}`;
          setThumbnail(localImageUri);
        }
      } catch (error) {
        console.error('Failed to save thumbnail:', error);
        alert('Failed to save image. Please try again.');
      }
    }
  };

  const handleClose = () => {
    setName(workflow.name);
    setThumbnail(workflow.thumbnail || '');
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
            <Text className="text-lg font-semibold text-primary-500">Edit Workflow</Text>
          </ModalHeader>

          <ModalBody scrollEnabled={false}>
            <VStack space="md">
              <FormControl isInvalid={!!error}>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-primary-400">Name</Text>
                </FormControlLabel>
                <Input variant="outline" size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                  <InputField
                    onChangeText={(value) => {
                      setName(value);
                      setError('');
                    }}
                    defaultValue={name}
                    placeholder="Enter workflow name"
                    className="px-3 py-2 text-sm text-primary-500 placeholder:text-primary-300"
                  />
                </Input>
                {error && (
                  <FormControlError>
                    <Text className="mt-1.5 text-xs text-error-600">{error}</Text>
                  </FormControlError>
                )}
              </FormControl>

              <VStack space="xs">
                <Text className="text-sm font-medium text-primary-400">Thumbnail (Optional)</Text>
                <Pressable onPress={handleSelectImage} className="overflow-hidden rounded-md border-0 bg-background-0">
                  {thumbnail ? (
                    <Image
                      source={{ uri: thumbnail }}
                      className="h-32 w-full"
                      resizeMode="cover"
                      alt="Workflow thumbnail"
                    />
                  ) : (
                    <VStack className="h-32 items-center justify-center">
                      <ImagePlus className="text-primary-300" />
                      <Text className="mt-2 text-sm text-primary-300">Add thumbnail</Text>
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
