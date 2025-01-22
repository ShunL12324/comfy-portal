import React from 'react';
import { Modal } from '@/components/ui/modal';
import { FormControl } from '@/components/ui/form-control';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Animated, Keyboard, Platform } from 'react-native';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_NAME_LENGTH = 30;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const KEYBOARD_OFFSET = Platform.OS === 'ios' ? 100 : 0;

export const AddServerModal = ({ isOpen, onClose }: AddServerModalProps) => {
  const addServer = useServersStore((state) => state.addServer);
  const [name, setName] = React.useState('');
  const [domain, setDomain] = React.useState('');
  const [port, setPort] = React.useState('8188');
  const [errors, setErrors] = React.useState({
    name: '',
    domain: '',
    port: '',
  });

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

  const validateName = (value: string) => {
    if (value.length === 0) {
      return 'Name is required';
    }
    if (value.length > MAX_NAME_LENGTH) {
      return `Name must be less than ${MAX_NAME_LENGTH} characters`;
    }
    return '';
  };

  const validateDomain = (value: string) => {
    if (value.length === 0) {
      return 'Domain is required';
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
      return 'Invalid domain or IP address';
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
    const domainError = validateDomain(domain);
    const portError = validatePort(port);

    setErrors({
      name: nameError,
      domain: domainError,
      port: portError,
    });

    if (nameError || domainError || portError) {
      return;
    }

    addServer({
      name,
      domain,
      port: parseInt(port, 10),
    });
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDomain('');
    setPort('8188');
    setErrors({
      name: '',
      domain: '',
      port: '',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Animated.View
        style={{
          transform: [{ translateY }],
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <ModalContent className="overflow-hidden rounded-2xl bg-background-0">
          <VStack>
            <ModalHeader className="border-b-[0.5px] border-background-200 pb-4">
              <Text className="text-lg font-semibold text-primary-500">
                Add Server
              </Text>
            </ModalHeader>
            <ModalBody className="py-6">
              <VStack space="lg">
                <FormControl isInvalid={!!errors.name}>
                  <FormControlLabel>
                    <Text className="text-sm font-medium text-primary-400">
                      Name
                    </Text>
                  </FormControlLabel>
                  <Input className="mt-1.5 overflow-hidden rounded-xl border-[0.5px] border-background-200">
                    <InputField
                      value={name}
                      onChangeText={(value) => {
                        setName(value);
                        setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="Server name"
                      maxLength={MAX_NAME_LENGTH}
                      className="bg-background-0 text-primary-500 placeholder:text-primary-300"
                    />
                  </Input>
                  {errors.name && (
                    <FormControlError>
                      <Text className="mt-1.5 text-xs text-error-600">
                        {errors.name}
                      </Text>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.domain}>
                  <FormControlLabel>
                    <Text className="text-sm font-medium text-primary-400">
                      Domain
                    </Text>
                  </FormControlLabel>
                  <Input className="mt-1.5 overflow-hidden rounded-xl border-[0.5px] border-background-200">
                    <InputField
                      value={domain}
                      onChangeText={(value) => {
                        setDomain(value);
                        setErrors((prev) => ({ ...prev, domain: '' }));
                      }}
                      placeholder="Domain or IP address"
                      className="bg-background-0 text-primary-500 placeholder:text-primary-300"
                    />
                  </Input>
                  {errors.domain && (
                    <FormControlError>
                      <Text className="mt-1.5 text-xs text-error-600">
                        {errors.domain}
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
                  <Input className="mt-1.5 overflow-hidden rounded-xl border-[0.5px] border-background-200">
                    <InputField
                      value={port}
                      onChangeText={(value) => {
                        setPort(value);
                        setErrors((prev) => ({ ...prev, port: '' }));
                      }}
                      placeholder="Port number"
                      className="bg-background-0 text-primary-500 placeholder:text-primary-300"
                      keyboardType="numeric"
                    />
                  </Input>
                  {errors.port && (
                    <FormControlError>
                      <Text className="mt-1.5 text-xs text-error-600">
                        {errors.port}
                      </Text>
                    </FormControlError>
                  )}
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter className="border-t-[0.5px] border-background-200 pt-4">
              <HStack space="sm">
                <Button
                  variant="outline"
                  onPress={handleClose}
                  className="flex-1 rounded-xl border-[0.5px] border-background-200"
                >
                  <ButtonText className="text-primary-400">Cancel</ButtonText>
                </Button>
                <Button
                  variant="solid"
                  onPress={handleSave}
                  className="flex-1 rounded-xl bg-primary-500 active:bg-primary-600"
                >
                  <ButtonText className="text-background-0">
                    Add Server
                  </ButtonText>
                </Button>
              </HStack>
            </ModalFooter>
          </VStack>
        </ModalContent>
      </Animated.View>
    </Modal>
  );
};
