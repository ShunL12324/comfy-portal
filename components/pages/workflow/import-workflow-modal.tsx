import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlError, FormControlLabel } from '@/components/ui/form-control';
import { Image } from '@/components/ui/image';
import { Input, InputField } from '@/components/ui/input';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/store/workflow';
import { saveWorkflowThumbnail } from '@/utils/image-storage';
import { parseWorkflowTemplate } from '@/utils/workflow-parser';
import * as ExpoClipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Clipboard, FileJson, ImagePlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Animated, Keyboard } from 'react-native';

interface AddWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

export function ImportWorkflowModal({ isOpen, onClose, serverId }: AddWorkflowModalProps) {
  const [name, setName] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [error, setError] = useState('');
  const addWorkflow = useWorkflowStore((state) => state.addWorkflow);
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

    const workflowId = Crypto.randomUUID();
    let finalThumbnail = '';
    if (thumbnail) {
      const ext = thumbnail.split('.').pop();
      const newPath = `${FileSystem.documentDirectory}workflows/${workflowId}/thumbnail.${ext}`;

      try {
        // Create directories if they don't exist
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}workflows/${workflowId}`, {
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

    addWorkflow({
      name: name.trim(),
      serverId,
      thumbnail: finalThumbnail,
      addMethod: 'preset',
      data: parseWorkflowTemplate(require('@/tools/setu.json')),
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
        const savedImage = await saveWorkflowThumbnail({
          serverId,
          workflowId: tempId,
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
    setName('');
    setThumbnail('');
    setError('');
    onClose();
  };

  const handleImportFromFile = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const workflowData = JSON.parse(fileContent);

      // Here you would validate the workflow data and process it
      addWorkflow({
        name: name.trim(),
        serverId,
        thumbnail: thumbnail,
        addMethod: 'file',
        data: parseWorkflowTemplate(workflowData),
      });

      handleClose();
    } catch (error) {
      console.error('Failed to import workflow file:', error);
      Alert.alert('Error', 'Failed to import workflow file. Please make sure it is a valid workflow JSON file.');
    }
  };

  const handleImportFromClipboard = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      const hasClipboardText = await ExpoClipboard.hasStringAsync();
      if (!hasClipboardText) {
        Alert.alert('Error', 'No text content found in clipboard.');
        return;
      }

      const clipboardContent = await ExpoClipboard.getStringAsync();
      if (!clipboardContent) {
        Alert.alert('Error', 'Clipboard is empty.');
        return;
      }

      const workflowData = JSON.parse(clipboardContent);

      // Here you would validate the workflow data and process it
      addWorkflow({
        name: name.trim(),
        serverId,
        thumbnail: thumbnail,
        addMethod: 'clipboard',
        data: parseWorkflowTemplate(workflowData),
      });

      handleClose();
    } catch (error) {
      console.error('Failed to import workflow from clipboard:', error);
      Alert.alert(
        'Error',
        'Failed to import workflow from clipboard. Please make sure you have copied a valid workflow JSON.',
      );
    }
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
            <Text className="text-lg font-semibold text-primary-500">Add Workflow</Text>
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
                    placeholder="Enter workflow name"
                    className="px-3 py-2 text-sm text-primary-500"
                  />
                </Input>
                {error && (
                  <FormControlError>
                    <Text className="mt-1.5 text-xs text-error-600">{error}</Text>
                  </FormControlError>
                )}
              </FormControl>

              <VStack space="sm">
                <Text className="text-sm font-medium text-primary-400">Import Workflow</Text>
                <Pressable
                  onPress={handleImportFromFile}
                  className="h-32 w-full items-center justify-center rounded-lg border border-dashed border-primary-300 bg-background-0"
                >
                  <VStack space="sm" className="items-center">
                    <FileJson size={24} className="text-primary-300" />
                    <VStack space="xs" className="items-center">
                      <Text className="text-sm font-medium text-primary-400">Click to select workflow file</Text>
                      <Text className="text-xs text-primary-300">Supports JSON format</Text>
                    </VStack>
                  </VStack>
                </Pressable>

                <Button variant="solid" onPress={handleImportFromClipboard} className="w-full rounded-md">
                  <ButtonIcon as={Clipboard} size="md" />
                  <ButtonText className="text-typography-0">Import from Clipboard</ButtonText>
                </Button>
              </VStack>

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
