import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FormControl } from '@/components/ui/form-control';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { useWorkflowsStore } from '@/store/workflows';
import { ModalContent } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal';
import { ModalBody } from '@/components/ui/modal';
import { ModalFooter } from '@/components/ui/modal';
import { FormControlLabel } from '@/components/ui/form-control';
import { InputField } from '@/components/ui/input';
import { ButtonText } from '@/components/ui/button';
import { Animated, Keyboard, Platform } from 'react-native';

interface AddWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: { uri: string; name: string };
  serverId: string;
}

const KEYBOARD_OFFSET = Platform.OS === 'ios' ? 100 : 0;

export function AddWorkflowModal({
  isOpen,
  onClose,
  file,
  serverId,
}: AddWorkflowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const addWorkflow = useWorkflowsStore((state) => state.addWorkflow);
  const translateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.spring(translateY, {
          toValue: -KEYBOARD_OFFSET,
          useNativeDriver: true,
          damping: 20,
          mass: 1,
          stiffness: 150,
        }).start();
      },
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          mass: 1,
          stiffness: 150,
        }).start();
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [translateY]);

  const handleSubmit = async () => {
    try {
      const response = await fetch(file.uri);
      const content = await response.text();

      addWorkflow({
        name: name || file.name,
        description,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        content,
        serverId,
      });

      onClose();
    } catch (error) {
      console.error('Error importing workflow:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Animated.View
        style={{
          transform: [{ translateY }],
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <ModalContent className="rounded-3xl border border-secondary-100">
          <ModalHeader className="border-b border-secondary-100 pb-4">
            <Text className="text-xl font-semibold text-primary-900">
              Import Workflow
            </Text>
          </ModalHeader>
          <ModalBody className="py-6">
            <VStack space="lg">
              <FormControl>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-secondary-700">
                    Name
                  </Text>
                </FormControlLabel>
                <Input className="mt-1.5 overflow-hidden rounded-xl border-secondary-200">
                  <InputField
                    placeholder={file.name}
                    value={name}
                    onChangeText={setName}
                    className="text-primary-900 placeholder:text-secondary-400"
                  />
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-secondary-700">
                    Description (Optional)
                  </Text>
                </FormControlLabel>
                <Input className="mt-1.5 overflow-hidden rounded-xl border-secondary-200">
                  <InputField
                    placeholder="Enter workflow description"
                    value={description}
                    onChangeText={setDescription}
                    className="text-primary-900 placeholder:text-secondary-400"
                  />
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-secondary-700">
                    Tags (Optional, comma separated)
                  </Text>
                </FormControlLabel>
                <Input className="mt-1.5 overflow-hidden rounded-xl border-secondary-200">
                  <InputField
                    placeholder="tag1, tag2, tag3"
                    value={tags}
                    onChangeText={setTags}
                    className="text-primary-900 placeholder:text-secondary-400"
                  />
                </Input>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter className="border-t border-secondary-100 p-4">
            <Button
              variant="outline"
              action="secondary"
              onPress={onClose}
              className="mr-2"
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button action="primary" onPress={handleSubmit}>
              <ButtonText>Import</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Animated.View>
    </Modal>
  );
}
