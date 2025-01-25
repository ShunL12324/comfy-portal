import React from 'react';
import { Modal, ModalBackdrop } from '@/components/ui/modal';
import { FormControl } from '@/components/ui/form-control';
import { Input } from '@/components/ui/input';
import { Button, ButtonIcon } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { useServersStore } from '@/store/servers';
import { ModalContent } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal';
import { ModalBody } from '@/components/ui/modal';
import { ModalFooter } from '@/components/ui/modal';
import { FormControlLabel } from '@/components/ui/form-control';
import { InputField } from '@/components/ui/input';
import { ButtonText } from '@/components/ui/button';
import { FormControlError } from '@/components/ui/form-control';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

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
  const [errors, setErrors] = React.useState({
    name: '',
    host: '',
    port: '',
  });

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
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    const localhostRegex = /^localhost$/;

    if (
      !ipRegex.test(value) &&
      !domainRegex.test(value) &&
      !localhostRegex.test(value)
    ) {
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
    const nameError = validateName(name);
    const hostError = validateHost(host);
    const portError = validatePort(port);

    setErrors({
      name: nameError,
      host: hostError,
      port: portError,
    });

    if (nameError || hostError || portError) {
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
    setErrors({
      name: '',
      host: '',
      port: '',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlayClick
      avoidKeyboard
    >
      <ModalBackdrop />
      <ModalContent className="max-w-md overflow-hidden rounded-xl border-0 bg-background-50">
        <VStack className="p-0">
          <ModalHeader className="px-0">
            <Text className="text-lg font-semibold text-primary-500">
              Add Server
            </Text>
          </ModalHeader>
          <ModalBody className="px-0 py-2">
            <VStack space="md">
              <FormControl isInvalid={!!errors.name}>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-primary-400">
                    Name
                  </Text>
                </FormControlLabel>
                <Input className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                  <InputField
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="Server name"
                    maxLength={MAX_NAME_LENGTH}
                    className="px-3 py-2 text-primary-500"
                  />
                </Input>
                {errors.name && (
                  <FormControlError>
                    <Text className="mt-1 text-xs text-error-600">
                      {errors.name}
                    </Text>
                  </FormControlError>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.host}>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-primary-400">
                    Host
                  </Text>
                </FormControlLabel>
                <Input className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                  <InputField
                    value={host}
                    onChangeText={(value) => {
                      setHost(value);
                      setErrors((prev) => ({ ...prev, host: '' }));
                    }}
                    placeholder="Host or IP address"
                    className="px-3 py-2 text-primary-500"
                  />
                </Input>
                {errors.host && (
                  <FormControlError>
                    <Text className="mt-1 text-xs text-error-600">
                      {errors.host}
                    </Text>
                  </FormControlError>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.port}>
                <FormControlLabel>
                  <Text className="text-sm font-medium text-primary-400">
                    Port
                  </Text>
                </FormControlLabel>
                <Input className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                  <InputField
                    value={port}
                    onChangeText={(value) => {
                      setPort(value);
                      setErrors((prev) => ({ ...prev, port: '' }));
                    }}
                    placeholder="Port number"
                    className="px-3 py-2 text-primary-500"
                    keyboardType="numeric"
                  />
                </Input>
                {errors.port && (
                  <FormControlError>
                    <Text className="mt-1 text-xs text-error-600">
                      {errors.port}
                    </Text>
                  </FormControlError>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter className="px-0">
            <HStack space="sm" className="py-0">
              <Button
                variant="outline"
                onPress={handleClose}
                className="flex-1 rounded-md bg-background-100"
              >
                <ButtonText className="text-primary-400">Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                onPress={handleSave}
                className="flex-1 rounded-md bg-primary-500"
              >
                <ButtonText className="text-background-0">Add</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </VStack>
      </ModalContent>
    </Modal>
  );
};
