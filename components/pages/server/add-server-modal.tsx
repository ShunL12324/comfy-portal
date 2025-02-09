import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { Button, ButtonText } from '@/components/ui/button';
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { Server } from '@/types/server';
import { parseServerUrl, validateHost, validatePort } from '@/utils/network';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Animated, Keyboard } from 'react-native';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_NAME_LENGTH = 30;
const MIN_PORT = 1;
const MAX_PORT = 65535;

export const AddServerModal = ({ isOpen, onClose }: AddServerModalProps) => {
  const addServer = useServersStore((state) => state.addServer);
  const [name, setName] = React.useState('');
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState('8188');
  const [useSSL, setUseSSL] = React.useState<Server['useSSL']>('Auto');
  const [nameError, setNameError] = React.useState('');
  const [hostError, setHostError] = React.useState('');
  const [portError, setPortError] = React.useState('');
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

    if (isOpen) {
      checkClipboard();
    }

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [isOpen]);

  const checkClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) return;

      const parsed = parseServerUrl(text);
      if (parsed) {
        setHost(parsed.host);
        setPort(parsed.port);
        setUseSSL(parsed.useSSL);

        // Try to generate a name from the host
        const suggestedName = parsed.host.split('.')[0];
        if (suggestedName && suggestedName.length <= MAX_NAME_LENGTH) {
          setName(suggestedName);
        }
      }
    } catch (error) {
      // Silently fail if we can't access clipboard
    }
  };

  const validateName = (value: string) => {
    if (value.length === 0) {
      return 'Name is required';
    }
    if (value.length > MAX_NAME_LENGTH) {
      return `Name must be less than ${MAX_NAME_LENGTH} characters`;
    }
    return '';
  };

  const handleSave = () => {
    const newNameError = validateName(name);
    const newHostError = validateHost(host);
    const newPortError = validatePort(port);

    setNameError(newNameError);
    setHostError(newHostError);
    setPortError(newPortError);

    if (newNameError || newHostError || newPortError) {
      return;
    }

    addServer({
      name,
      host,
      port: parseInt(port, 10),
      useSSL,
    });
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setHost('');
    setPort('8188');
    setUseSSL('Auto');
    setNameError('');
    setHostError('');
    setPortError('');
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
          <VStack space="md">
            <ModalHeader>
              <Text className="text-lg font-semibold text-primary-500">Add Server</Text>
            </ModalHeader>
            <ModalBody scrollEnabled={false}>
              <VStack space="md">
                <FormControl isInvalid={!!nameError} size="md">
                  <FormControlLabel>
                    <FormControlLabelText className="text-sm font-medium text-primary-400">Name</FormControlLabelText>
                  </FormControlLabel>
                  <Input size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                    <InputField
                      defaultValue={name}
                      onChangeText={(value) => {
                        setName(value);
                        setNameError('');
                      }}
                      placeholder="Server name"
                      maxLength={MAX_NAME_LENGTH}
                      className="px-3 py-2 text-primary-500"
                    />
                  </Input>
                  {nameError && (
                    <FormControlError>
                      <FormControlErrorText className="mt-1 text-xs text-error-600">{nameError}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!hostError} size="md">
                  <FormControlLabel>
                    <FormControlLabelText className="text-sm font-medium text-primary-400">Host</FormControlLabelText>
                  </FormControlLabel>
                  <Input size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                    <InputField
                      defaultValue={host}
                      onChangeText={(value) => {
                        setHost(value);
                        setHostError('');
                      }}
                      placeholder="Host or IP address"
                      className="px-3 py-2 text-primary-500"
                    />
                  </Input>
                  {hostError && (
                    <FormControlError>
                      <FormControlErrorText className="mt-1 text-xs text-error-600">{hostError}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!portError} size="md">
                  <FormControlLabel>
                    <FormControlLabelText className="text-sm font-medium text-primary-400">Port</FormControlLabelText>
                  </FormControlLabel>
                  <Input size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                    <InputField
                      defaultValue={port}
                      onChangeText={(value) => {
                        setPort(value);
                        setPortError('');
                      }}
                      placeholder="Port number"
                      keyboardType="numeric"
                      className="px-3 py-2 text-primary-500"
                    />
                  </Input>
                  {portError && (
                    <FormControlError>
                      <FormControlErrorText className="mt-1 text-xs text-error-600">{portError}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className="text-sm font-medium text-primary-400">
                      Use SSL
                    </FormControlLabelText>
                  </FormControlLabel>
                  <SegmentedControl
                    options={['Auto', 'Always', 'Never']}
                    value={useSSL}
                    onChange={(value) => {
                      setUseSSL(value as Server['useSSL']);
                    }}
                    className="mt-1"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <HStack space="sm">
                <Button variant="outline" onPress={handleClose} className="flex-1 rounded-md bg-background-100">
                  <ButtonText className="text-primary-400">Cancel</ButtonText>
                </Button>
                <Button variant="solid" onPress={handleSave} className="flex-1 rounded-md bg-primary-500">
                  <ButtonText className="text-background-0">Add</ButtonText>
                </Button>
              </HStack>
            </ModalFooter>
          </VStack>
        </ModalContent>
      </Animated.View>
    </Modal>
  );
};
