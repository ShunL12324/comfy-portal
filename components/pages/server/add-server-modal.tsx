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

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [translateY]);

  const validateName = (value: string) => {
    if (value.length === 0) {
      return 'Name is required';
    }
    if (value.length > MAX_NAME_LENGTH) {
      return `Name must be less than ${MAX_NAME_LENGTH} characters`;
    }
    return '';
  };

  const validateHost = (value: string) => {
    if (value.length === 0) {
      return 'Host is required';
    }
    // 允许 IP 地址或域名
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    const localhostRegex = /^localhost$/;

    if (!ipRegex.test(value) && !domainRegex.test(value) && !localhostRegex.test(value)) {
      return 'Invalid host or IP address';
    }

    if (ipRegex.test(value)) {
      const parts = value.split('.');
      for (const part of parts) {
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) {
          return 'Invalid IP address';
        }
      }
    }
    return '';
  };

  const validatePort = (value: string) => {
    if (value.length === 0) {
      return 'Port is required';
    }
    const portNum = parseInt(value, 10);
    if (isNaN(portNum)) {
      return 'Port must be a number';
    }
    if (portNum < MIN_PORT || portNum > MAX_PORT) {
      return `Port must be between ${MIN_PORT} and ${MAX_PORT}`;
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
    });
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setHost('');
    setPort('8188');
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
                      onChangeText={(value) => {
                        setName(value);
                        setNameError('');
                      }}
                      placeholder="Server name"
                      maxLength={MAX_NAME_LENGTH}
                      className="px-3 py-2 text-primary-500 placeholder:text-primary-300"
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
                      onChangeText={(value) => {
                        setHost(value);
                        setHostError('');
                      }}
                      placeholder="Host or IP address"
                      className="px-3 py-2 text-primary-500 placeholder:text-primary-300"
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
                      onChangeText={(value) => {
                        setPort(value);
                        setPortError('');
                      }}
                      placeholder="Port number"
                      keyboardType="numeric"
                      className="px-3 py-2 text-primary-500 placeholder:text-primary-300"
                    />
                  </Input>
                  {portError && (
                    <FormControlError>
                      <FormControlErrorText className="mt-1 text-xs text-error-600">{portError}</FormControlErrorText>
                    </FormControlError>
                  )}
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
