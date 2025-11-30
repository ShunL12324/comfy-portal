import { FormInput } from '@/components/self-ui/form-input';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { Server } from '@/features/server/types';
import { validateHost, validatePort } from '@/services/network';
import { useThemeStore } from '@/store/theme';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EditServerModalProps {
  serverId: string;
}

export interface EditServerModalRef {
  present: () => void;
}

const MAX_NAME_LENGTH = 30;

export const EditServerModal = forwardRef<
  EditServerModalRef,
  EditServerModalProps
>((props, ref) => {
  const { serverId } = props;
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark';
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const updateServer = useServersStore((state) => state.updateServer);

  // 状态管理
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8188');
  const [useSSL, setUseSSL] = useState<Server['useSSL']>('Auto');
  const [token, setToken] = useState('');
  const [nameError, setNameError] = useState('');
  const [hostError, setHostError] = useState('');
  const [portError, setPortError] = useState('');

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // 加载服务器数据
  const loadServerData = useCallback(() => {
    const server = useServersStore.getState().servers.find(s => s.id === serverId);
    if (server) {
      setName(server.name);
      setHost(server.host);
      setPort(server.port.toString());
      setUseSSL(server.useSSL);
      setToken(server.token || '');
    }
  }, [serverId]);

  // 表单验证
  const validateName = (value: string) => {
    if (value.length === 0) {
      return 'Name is required';
    }
    if (value.length > MAX_NAME_LENGTH) {
      return `Name must be less than ${MAX_NAME_LENGTH} characters`;
    }
    return '';
  };

  // 保存服务器数据
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

    updateServer(serverId, {
      name,
      host,
      port: parseInt(port, 10),
      useSSL,
      token: token || undefined,
    });

    handleClose();
  };

  // 关闭modal并重置表单
  const handleClose = useCallback(() => {
    setNameError('');
    setHostError('');
    setPortError('');
    bottomSheetModalRef.current?.dismiss();
  }, []);

  // 暴露present方法
  useImperativeHandle(ref, () => ({
    present: () => {
      loadServerData();
      bottomSheetModalRef.current?.present();
    },
  }));

  const maxHeight = useMemo(
    () => windowHeight - insets.top - 60,
    [windowHeight, insets.top],
  );

  return (
    <ThemedBottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      onDismiss={handleClose}
      enablePanDownToClose={true}
      topInset={insets.top}
      maxDynamicContentSize={maxHeight}
      enableDynamicSizing
    >
      <BottomSheetView style={{ paddingHorizontal: 16 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: '100%' }}
        >
          <VStack space="md" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="pb-2">
              <Text className="text-lg font-semibold text-primary-500">Edit Server</Text>
            </View>

            <FormInput
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

            <FormInput
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

            <FormInput
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

            <FormInput
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
                <ButtonText className="text-background-0">Save</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </ThemedBottomSheetModal>
  );
});

EditServerModal.displayName = 'EditServerModal';
