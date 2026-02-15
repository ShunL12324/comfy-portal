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
import { validateHost, validatePort } from '@/services/network';
import { useResolvedTheme } from '@/store/theme';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
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
  const theme = useResolvedTheme();
  const isDarkMode = theme === 'dark';
  const insets = useSafeAreaInsets();
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

  // Workaround: manually restore position when keyboard hides
  // https://github.com/gorhom/react-native-bottom-sheet/issues/1894
  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      bottomSheetModalRef.current?.snapToIndex(0);
    });
    return () => hideSubscription.remove();
  }, []);

  return (
    <ThemedBottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={['70%']}
      onDismiss={handleClose}
      enablePanDownToClose={true}
      topInset={insets.top}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView style={{ paddingHorizontal: 16 }}>
        <VStack space="md" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="pb-2">
              <Text className="text-lg font-semibold text-primary-500">Edit Server</Text>
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

            <HStack space="sm" className="mt-3">
              <Button variant="outline" onPress={handleClose} className="flex-1 rounded-md bg-background-100 py-2">
                <ButtonText className="text-primary-400">Cancel</ButtonText>
              </Button>
              <Button variant="solid" onPress={handleSave} className="flex-1 rounded-md bg-primary-500 py-2">
                <ButtonText className="text-background-0">Save</ButtonText>
              </Button>
            </HStack>
          </VStack>
      </BottomSheetScrollView>
    </ThemedBottomSheetModal>
  );
});

EditServerModal.displayName = 'EditServerModal';
