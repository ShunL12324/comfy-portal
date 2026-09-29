import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { BottomSheetFormInput } from '@/components/self-ui/form-input/bottom-sheet-form-input';
import { ThemedBottomSheetModal, ThemedSheetFooter } from '@/components/self-ui/themed-bottom-sheet-modal';
import { designTokens as t } from '@/constants/design-tokens';
import { Action, Copy, Segments, Title } from '@/components/ui/design-system/primitives';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { Server } from '@/features/server/types';
import { parseServerUrl, validateHost, validatePort } from '@/services/network';
import { BottomSheetModal, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface AddServerModalRef {
  present: () => void;
}

const MAX_NAME_LENGTH = 30;

export const AddServerModal = forwardRef<AddServerModalRef>((props, ref) => {
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
    } catch {
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

  /**
   * Cleanup only — no dismiss call. This runs *because* the sheet has
   * already gone, so asking it to go again re-enters the modal's dismissal
   * path and leaves its internal mount state out of sync, after which
   * present() is silently ignored and the button appears dead.
   */
  const handleDismissed = useCallback(() => {
    setName('');
    setHost('');
    setPort('8188');
    setUseSSL('Auto');
    setNameError('');
    setHostError('');
    setPortError('');
    setToken('');
  }, []);

  /** For the buttons: ask the sheet to close. onDismiss does the cleanup. */
  const handleClose = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const renderFooter = (footerProps: BottomSheetFooterProps) => (
    <ThemedSheetFooter {...footerProps}>
      <Action kind="secondary" fill onPress={handleClose}>
        Cancel
      </Action>
      <Action kind="primary" fill onPress={handleSave}>
        Add
      </Action>
    </ThemedSheetFooter>
  );

  return (
    <ThemedBottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      enableDynamicSizing
      footerComponent={renderFooter}
      onDismiss={handleDismissed}
      topInset={insets.top}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <AdaptiveScrollView
        keyboardShouldPersistTaps="handled"
        enableFooterMarginAdjustment
        contentContainerStyle={{ paddingHorizontal: t.layout.inset, paddingBottom: insets.bottom + t.layout.inset }}
      >
        <VStack style={{ gap: t.layout.field }}>
          <View testID="add-server-sheet-title" style={{ paddingBottom: t.layout.related }}>
            <Title>Add server</Title>
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

          <VStack style={{ gap: t.layout.label }}>
            <Copy size="label" muted>
              Use SSL
            </Copy>
            <Segments
              options={['Auto', 'Always', 'Never']}
              value={useSSL}
              onChange={(value) => {
                setUseSSL(value as Server['useSSL']);
              }}
            />
          </VStack>
        </VStack>
      </AdaptiveScrollView>
    </ThemedBottomSheetModal>
  );
});

AddServerModal.displayName = 'AddServerModal';
