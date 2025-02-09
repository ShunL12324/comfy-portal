import { KeyboardModal } from '@/components/self-ui/keyboard-modal';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/store/workflow';
import { saveWorkflowThumbnail } from '@/utils/image-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus } from 'lucide-react-native';
import React, { useState } from 'react';

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

  if (!workflow) return null;

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
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}workflows/${workflow.id}`, {
          intermediates: true,
        });
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
    <KeyboardModal isOpen={isOpen} onClose={handleClose}>
      <KeyboardModal.Header>
        <Text className="text-lg font-semibold text-primary-500">Edit Workflow</Text>
      </KeyboardModal.Header>

      <KeyboardModal.Body scrollEnabled={false}>
        <VStack space="md">
          <KeyboardModal.Item title="Name" error={error}>
            <Input variant="outline" size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
              <InputField
                onChangeText={(value) => {
                  setName(value);
                  setError('');
                }}
                defaultValue={name}
                placeholder="Enter workflow name"
                className="px-3 py-2 text-sm text-primary-500"
              />
            </Input>
          </KeyboardModal.Item>

          <VStack space="xs">
            <Text className="text-sm font-medium text-primary-400">Thumbnail (Optional)</Text>
            <Pressable onPress={handleSelectImage} className="overflow-hidden rounded-md border-0 bg-background-0">
              {thumbnail ? (
                <Image
                  source={{ uri: thumbnail }}
                  className="h-40 w-full"
                  resizeMode="cover"
                  alt="Workflow thumbnail"
                />
              ) : (
                <VStack className="h-40 items-center justify-center">
                  <ImagePlus className="text-primary-300" />
                  <Text className="mt-2 text-sm text-primary-300">Add thumbnail</Text>
                </VStack>
              )}
            </Pressable>
          </VStack>
        </VStack>
      </KeyboardModal.Body>

      <KeyboardModal.Footer>
        <HStack space="sm">
          <Button variant="outline" onPress={handleClose} className="flex-1 rounded-md bg-background-100">
            <ButtonText className="text-primary-400">Cancel</ButtonText>
          </Button>
          <Button variant="solid" onPress={handleUpdate} className="flex-1 rounded-md bg-primary-500">
            <ButtonText className="text-background-0">Save Changes</ButtonText>
          </Button>
        </HStack>
      </KeyboardModal.Footer>
    </KeyboardModal>
  );
}
