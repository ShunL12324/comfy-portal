import { KeyboardModal } from '@/components/self-ui/keyboard-modal';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { Server } from '@/types/server';
import { validateHost, validatePort } from '@/utils/network';
import React from 'react';

interface EditServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

const MAX_NAME_LENGTH = 30;

export const EditServerModal = ({ isOpen, onClose, serverId }: EditServerModalProps) => {
  const updateServer = useServersStore((state) => state.updateServer);
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  if (!server) {
    return null;
  }

  const [name, setName] = React.useState(server.name);
  const [host, setHost] = React.useState(server.host);
  const [port, setPort] = React.useState(server.port.toString());
  const [useSSL, setUseSSL] = React.useState<Server['useSSL']>(server.useSSL);
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

    updateServer(server.id, {
      name,
      host,
      port: parseInt(port, 10),
      useSSL,
    });
    onClose();
  };

  const handleClose = () => {
    setName(server.name);
    setHost(server.host);
    setPort(server.port.toString());
    setUseSSL(server.useSSL);
    setErrors({
      name: '',
      host: '',
      port: '',
    });
    onClose();
  };

  return (
    <KeyboardModal isOpen={isOpen} onClose={handleClose}>
      <KeyboardModal.Header>
        <Text className="text-lg font-semibold text-primary-500">Edit Server</Text>
      </KeyboardModal.Header>

      <KeyboardModal.Body scrollEnabled={false}>
        <VStack space="md">
          <KeyboardModal.Item title="Name" error={errors.name}>
            <Input size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
              <InputField
                defaultValue={name}
                onChangeText={(value) => {
                  setName(value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Server name"
                maxLength={MAX_NAME_LENGTH}
                className="px-3 py-2 text-primary-500"
              />
            </Input>
          </KeyboardModal.Item>

          <KeyboardModal.Item title="Host" error={errors.host}>
            <Input size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
              <InputField
                defaultValue={host}
                onChangeText={(value) => {
                  setHost(value);
                  setErrors((prev) => ({ ...prev, host: '' }));
                }}
                placeholder="Host or IP address"
                className="px-3 py-2 text-primary-500"
              />
            </Input>
          </KeyboardModal.Item>

          <KeyboardModal.Item title="Port" error={errors.port}>
            <Input size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
              <InputField
                defaultValue={port}
                onChangeText={(value) => {
                  setPort(value);
                  setErrors((prev) => ({ ...prev, port: '' }));
                }}
                placeholder="Port number"
                keyboardType="numeric"
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
            <ButtonText className="text-background-0">Save Changes</ButtonText>
          </Button>
        </HStack>
      </KeyboardModal.Footer>
    </KeyboardModal>
  );
};
