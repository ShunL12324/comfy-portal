import { KeyboardModal } from '@/components/self-ui/keyboard-modal';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { Server } from '@/types/server';
import { parseServerUrl, validateHost, validatePort } from '@/utils/network';
import * as Clipboard from 'expo-clipboard';
import React from 'react';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_NAME_LENGTH = 30;

export const AddServerModal = ({ isOpen, onClose }: AddServerModalProps) => {
  const addServer = useServersStore((state) => state.addServer);
  const [name, setName] = React.useState('');
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState('8188');
  const [useSSL, setUseSSL] = React.useState<Server['useSSL']>('Auto');
  const [token, setToken] = React.useState('');
  const [nameError, setNameError] = React.useState('');
  const [hostError, setHostError] = React.useState('');
  const [portError, setPortError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      checkClipboard();
    }
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
      token: token || undefined,
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
    setToken('');
    onClose();
  };

  return (
    <KeyboardModal isOpen={isOpen} onClose={handleClose} closeOnOverlayClick={true}>
      <KeyboardModal.Header>
        <Text className="text-lg font-semibold text-primary-500">Add Server</Text>
      </KeyboardModal.Header>

      <KeyboardModal.Body scrollEnabled={false}>
        <VStack space="md">
          <KeyboardModal.Item title="Name" error={nameError}>
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
          </KeyboardModal.Item>

          <KeyboardModal.Item title="Host" error={hostError}>
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
          </KeyboardModal.Item>

          <KeyboardModal.Item title="Port" error={portError}>
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
          </KeyboardModal.Item>

          <KeyboardModal.Item title="Authorization Token (Optional)">
            <Input size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
              <InputField
                defaultValue={token}
                onChangeText={setToken}
                placeholder="Enter token (without 'Bearer')"
                secureTextEntry={true}
                className="px-3 py-2 text-primary-500"
              />
            </Input>
          </KeyboardModal.Item>

          <KeyboardModal.Item title="Use SSL">
            <SegmentedControl
              options={['Auto', 'Always', 'Never']}
              value={useSSL}
              onChange={(value) => {
                setUseSSL(value as Server['useSSL']);
              }}
              className="mt-1"
            />
          </KeyboardModal.Item>
        </VStack>
      </KeyboardModal.Body>

      <KeyboardModal.Footer>
        <HStack space="sm">
          <Button variant="outline" onPress={handleClose} className="flex-1 rounded-md bg-background-100">
            <ButtonText className="text-primary-400">Cancel</ButtonText>
          </Button>
          <Button variant="solid" onPress={handleSave} className="flex-1 rounded-md bg-primary-500">
            <ButtonText className="text-background-0">Add</ButtonText>
          </Button>
        </HStack>
      </KeyboardModal.Footer>
    </KeyboardModal>
  );
};
