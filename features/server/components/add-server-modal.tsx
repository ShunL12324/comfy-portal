import { BottomSheetFormInput } from '@/components/self-ui/form-input/bottom-sheet-form-input';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { Server } from '@/features/server/types';
import { parseServerUrl, validateHost, validatePort } from '@/services/network';
import { useResolvedTheme } from '@/store/theme';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddServerModalProps {
  // No isOpen or onClose needed
}

export interface AddServerModalRef {
  present: () => void;
}

const MAX_NAME_LENGTH = 30;

export const AddServerModal = forwardRef<AddServerModalRef, AddServerModalProps>(
  (props, ref) => {
    const theme = useResolvedTheme();
    const isDarkMode = theme === 'dark';
    const insets = useSafeAreaInsets();
    const addServer = useServersStore((state) => state.addServer);
    const [name, setName] = React.useState('');
    const [host, setHost] = React.useState('');
    const [port, setPort] = React.useState('8188');
    const [useSSL, setUseSSL] = React.useState<Server['useSSL']>('Auto');
    const [token, setToken] = React.useState('');
    const [nameError, setNameError] = React.useState('');
    const [hostError, setHostError] = React.useState('');
    const [portError, setPortError] = React.useState('');

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => {
        checkClipboard();
        bottomSheetModalRef.current?.present();
      },
    }));

    // Workaround: manually restore position when keyboard hides
    // https://github.com/gorhom/react-native-bottom-sheet/issues/1894
    useEffect(() => {
      const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
        bottomSheetModalRef.current?.snapToIndex(0);
      });
      return () => hideSubscription.remove();
    }, []);

    const checkClipboard = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        if (!text) return;

        const parsed = parseServerUrl(text);
        if (parsed) {
          setHost(parsed.host);
          setPort(parsed.port);
          setUseSSL(parsed.useSSL);
          const suggestedName = parsed.host.split('.')[0];
          if (suggestedName && suggestedName.length <= MAX_NAME_LENGTH) {
            setName(suggestedName);
          } else {
            setName('');
          }
        } else {
          setName('');
          setHost('');
          setPort('8188');
          setUseSSL('Auto');
          setToken('');
        }
      } catch (error) {
        // Silently fail
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

    const handleClose = useCallback(() => {
      setName('');
      setHost('');
      setPort('8188');
      setUseSSL('Auto');
      setNameError('');
      setHostError('');
      setPortError('');
      setToken('');
      bottomSheetModalRef.current?.dismiss();
    }, []);

    return (
      <ThemedBottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={['70%']}
        onDismiss={handleClose}
        topInset={insets.top}
        enablePanDownToClose={true}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          style={{
            paddingHorizontal: 16,
          }}
        >
          <VStack space="md" style={{ paddingBottom: insets.bottom + 24 }}>
              <View className="pb-2">
                <Text className="text-lg font-semibold text-primary-500">Add Server</Text>
              </View>

              <BottomSheetFormInput
                title="Name"
                error={nameError}
                defaultValue={name}
                onChangeText={(value: string) => {
                  setName(value);
                  setNameError('');
                }}
                placeholder="Server name"
                maxLength={MAX_NAME_LENGTH}
              />

              <BottomSheetFormInput
                title="Host"
                error={hostError}
                defaultValue={host}
                onChangeText={(value: string) => {
                  setHost(value);
                  setHostError('');
                }}
                placeholder="Host or IP address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <BottomSheetFormInput
                title="Port"
                error={portError}
                defaultValue={port}
                onChangeText={(value: string) => {
                  setPort(value);
                  setPortError('');
                }}
                placeholder="Port number"
                keyboardType="numeric"
              />

              <BottomSheetFormInput
                title="Authorization Token (Optional)"
                defaultValue={token}
                onChangeText={(value: string) => setToken(value)}
                placeholder="Enter token (without 'Bearer')"
                secureTextEntry={true}
              />

              <VStack space="xs">
                <Text className="text-sm font-medium text-typography-600">Use SSL</Text>
                <SegmentedControl
                  options={['Auto', 'Always', 'Never']}
                  value={useSSL}
                  onChange={(value) => {
                    setUseSSL(value as Server['useSSL']);
                  }}
                  className="mt-1"
                />
              </VStack>

              <HStack space="sm" style={{ marginTop: 12 }}>
                <Button variant="outline" onPress={handleClose} className="flex-1 rounded-md bg-background-100 py-2">
                  <ButtonText className="text-primary-400">Cancel</ButtonText>
                </Button>
                <Button variant="solid" onPress={handleSave} className="flex-1 rounded-md bg-primary-500 py-2">
                  <ButtonText className="text-background-0">Add</ButtonText>
                </Button>
              </HStack>
            </VStack>
        </BottomSheetScrollView>
      </ThemedBottomSheetModal>
    );
  },
);

AddServerModal.displayName = 'AddServerModal';
