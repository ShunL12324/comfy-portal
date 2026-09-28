import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { Action, Copy, Title, useDesign } from '@/components/ui/design-system/primitives';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { KeyboardModal } from '@/components/self-ui/keyboard-modal';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { saveWorkflowThumbnail } from '@/services/image-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from '@/constants/icons';
import React, { useState } from 'react';

interface EditWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
}

const MAX_NAME_LENGTH = 50;

export function EditWorkflowModal({ isOpen, onClose, workflowId }: EditWorkflowModalProps) {
  const c = useDesign();
  const workflow = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const removeWorkflow = useWorkflowStore((state) => state.removeWorkflow);
  const [name, setName] = useState(workflow?.name || '');
  const [thumbnail, setThumbnail] = useState(workflow?.thumbnail || '');
  const [error, setError] = useState('');
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);

  // Each opening starts from the saved workflow.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen && workflow) {
      setName(workflow.name);
      setThumbnail(workflow.thumbnail || '');
      setError('');
    }
  }

  if (!workflow) return null;
  const serverSource = workflow.addMethod === 'server-sync';

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    let finalThumbnail = thumbnail;
    if (thumbnail && thumbnail !== workflow.thumbnail) {
      const ext = thumbnail.split('.').pop();
      const workflowDir = new Directory(Paths.document, 'workflows', workflow.id);
      const thumbnailFile = new File(workflowDir, `thumbnail.${ext}`);

      try {
        workflowDir.create({ intermediates: true, idempotent: true });
        await new File(thumbnail).copy(thumbnailFile);
        finalThumbnail = thumbnailFile.uri;
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

  const handleDelete = () => {
    removeWorkflow(workflow.id);
    setIsDeleteAlertOpen(false);
    onClose();
  };

  return (
    <>
      <KeyboardModal isOpen={isOpen} onClose={handleClose}>
        <KeyboardModal.Header>
          <HStack className="w-full items-center justify-between">
            <Title>Edit Workflow</Title>
            <Action kind="text" icon={X} label="Close workflow editor" onPress={handleClose} />
          </HStack>
        </KeyboardModal.Header>

        <KeyboardModal.Body scrollEnabled={false}>
          <VStack space="md">
            <KeyboardModal.Item title="Name" error={error}>
              <Input variant="outline" size="md" className="mt-1 rounded-md bg-surface-base overflow-hidden border-0">
                <InputField
                  onChangeText={(value) => {
                    setName(value);
                    setError('');
                  }}
                  defaultValue={name}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder="Enter workflow name"
                  className="px-3 py-2 text-action"
                />
              </Input>
            </KeyboardModal.Item>

            <KeyboardModal.Item title="Thumbnail (Optional)">
              <Pressable onPress={handleSelectImage} className="rounded-md bg-surface-base overflow-hidden border-0">
                {thumbnail ? (
                  <Image
                    source={{ uri: thumbnail }}
                    className="h-20 w-full"
                    resizeMode="cover"
                    alt="Workflow thumbnail"
                  />
                ) : (
                  <VStack className="h-20 items-center justify-center">
                    <ImagePlus
                      size={t.icon.hero}
                      strokeWidth={iconStroke(t.icon.hero)}
                      className="text-content-secondary"
                    />
                    <Copy size="label" className="mt-2" style={{ color: c.secondary }}>
                      Add thumbnail
                    </Copy>
                  </VStack>
                )}
              </Pressable>
            </KeyboardModal.Item>
          </VStack>
        </KeyboardModal.Body>

        <KeyboardModal.Footer>
          <HStack space="sm">
            <Action kind="secondary" destructive onPress={() => setIsDeleteAlertOpen(true)}>
              {serverSource ? 'Hide on this device' : 'Remove workflow'}
            </Action>
            <Action kind="primary" onPress={handleUpdate}>
              Save changes
            </Action>
          </HStack>
        </KeyboardModal.Footer>
      </KeyboardModal>

      <ConfirmDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDelete}
        title={serverSource ? 'Hide workflow?' : 'Remove workflow?'}
        description={
          serverSource
            ? 'It will stay hidden after syncing. The server file and generated results are kept. You can restore it from Hidden workflows.'
            : 'Remove this workflow from this server’s list? The saved workflow content and generated results are kept.'
        }
        confirmText={serverSource ? 'Hide workflow' : 'Remove workflow'}
        destructive
      />
    </>
  );
}
