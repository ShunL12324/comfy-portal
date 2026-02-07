import { KeyboardModal } from '@/components/self-ui/keyboard-modal';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Input, InputField } from '@/components/ui/input';
import { Link, LinkText } from '@/components/ui/link';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { parseWorkflowTemplate } from '@/features/workflow/utils/workflow-parser';
import { saveWorkflowThumbnail } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import * as ExpoClipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { CheckCircle, Clipboard, FileJson, ImagePlus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

export function ImportWorkflowModal({ isOpen, onClose, serverId }: AddWorkflowModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('New Workflow');
  const [thumbnail, setThumbnail] = useState('');
  const [error, setError] = useState('');
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const addWorkflow = useWorkflowStore((state) => state.addWorkflow);

  useEffect(() => {
    if (name.trim().length > 50) {
      setName(name.slice(0, 50));
      showToast.error('Name must be less than 50 characters', undefined, insets.top + 8);
    }
  }, [insets.top, name]);

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!workflowData) {
      setError('Please import a workflow first');
      return;
    }

    const workflowId = Crypto.randomUUID();
    let finalThumbnail = '';
    if (thumbnail) {
      const ext = thumbnail.split('.').pop();
      const workflowDir = new Directory(Paths.document, 'workflows', workflowId);
      const thumbnailFile = new File(workflowDir, `thumbnail.${ext}`);

      try {
        workflowDir.create({ intermediates: true, idempotent: true });
        new File(thumbnail).copy(thumbnailFile);
        finalThumbnail = thumbnailFile.uri;
      } catch (error) {
        console.error('Failed to save thumbnail:', error);
      }
    }

    addWorkflow({
      name: name.trim(),
      serverId,
      thumbnail: finalThumbnail,
      addMethod: workflowData.addMethod,
      data: workflowData.data,
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
    setWorkflowData(null);
    setUploadedFileName('');
    onClose();
  };

  const handleImportFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const fileContent = await new File(result.assets[0].uri).text();
      const jsonData = JSON.parse(fileContent);

      setWorkflowData({
        addMethod: 'file',
        data: parseWorkflowTemplate(jsonData),
      });
      setUploadedFileName(result.assets[0].name);
      setName(result.assets[0].name);
    } catch (error) {
      console.error('Failed to import workflow file:', error);
      showToast.error('Import Failed', 'Please make sure it is a valid workflow JSON file.', insets.top);
    }
  };

  const handleImportFromClipboard = async () => {
    try {
      const hasClipboardText = await ExpoClipboard.hasStringAsync();
      if (!hasClipboardText) {
        showToast.error('Import Failed', 'No text content found in clipboard.', insets.top);
        return;
      }

      const clipboardContent = await ExpoClipboard.getStringAsync();
      if (!clipboardContent) {
        showToast.error('Import Failed', 'Clipboard is empty.', insets.top);
        return;
      }

      const jsonData = JSON.parse(clipboardContent);

      setWorkflowData({
        addMethod: 'clipboard',
        data: parseWorkflowTemplate(jsonData),
      });
      setUploadedFileName('Imported from clipboard');
    } catch (error) {
      console.error('Failed to import workflow from clipboard:', error);
      showToast.error('Import Failed', 'Please make sure you have copied a valid workflow JSON.', insets.top);
    }
  };

  return (
    <KeyboardModal isOpen={isOpen} onClose={handleClose}>
      <KeyboardModal.Header>
        <Text className="text-lg font-semibold text-primary-500">Import Workflow</Text>
      </KeyboardModal.Header>

      <KeyboardModal.Body scrollEnabled={false}>
        <VStack space="md">
          <KeyboardModal.Item title="Name" error={error}>
            <Input variant="outline" size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
              <InputField
                defaultValue={name}
                onChangeText={(value) => {
                  setName(value);
                  setError('');
                }}
                placeholder="Enter workflow name"
                className="px-3 py-2 text-sm text-primary-500"
              />
            </Input>
          </KeyboardModal.Item>

          <VStack space="sm">
            <HStack space="sm" className="items-center">
              <Text className="text-sm font-medium text-primary-400">Import Workflow</Text>
              <Link href="https://shunl12324.github.io/comfy-portal/guide/workflow-json">
                <LinkText className="text-xs">Where to get my workflow file?</LinkText>
              </Link>
            </HStack>
            <Pressable
              onPress={handleImportFromFile}
              className="h-32 w-full items-center justify-center rounded-lg border border-dashed border-primary-300 bg-background-0"
            >
              <VStack space="sm" className="items-center">
                <FileJson size={24} className={workflowData ? 'text-primary-500' : 'text-primary-300'} />
                <VStack space="xs" className="items-center">
                  {uploadedFileName ? (
                    <>
                      <Text className="text-sm font-medium text-primary-500">{uploadedFileName}</Text>
                      <Text className="text-xs text-primary-300">Click to change file</Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-sm font-medium text-primary-400">Click to select workflow file</Text>
                      <Text className="text-xs text-primary-300">Supports JSON format</Text>
                    </>
                  )}
                </VStack>
              </VStack>
            </Pressable>

            <Button
              variant="solid"
              onPress={handleImportFromClipboard}
              className={`w-full rounded-md ${workflowData?.addMethod === 'clipboard' ? 'bg-success-500' : ''}`}
            >
              <ButtonIcon as={workflowData?.addMethod === 'clipboard' ? CheckCircle : Clipboard} size="md" />
              <ButtonText className="text-typography-0">
                {workflowData?.addMethod === 'clipboard' ? 'Imported from Clipboard' : 'Import from Clipboard'}
              </ButtonText>
            </Button>
          </VStack>

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
          <Button
            variant="solid"
            onPress={handleAdd}
            className={`flex-1 rounded-md ${!name.trim() || !workflowData ? 'bg-primary-300 opacity-50' : 'bg-primary-500'
              }`}
            disabled={!name.trim() || !workflowData}
          >
            <ButtonText className="text-background-0">Add</ButtonText>
          </Button>
        </HStack>
      </KeyboardModal.Footer>
    </KeyboardModal>
  );
}
