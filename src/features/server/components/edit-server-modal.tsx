import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { router } from 'expo-router';
import { destroyCloudInstance } from '@/features/cloud/services/provider';
import { launchKey, useProvisioningStore } from '@/features/cloud/stores/provisioning-store';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { showToast } from '@/utils/toast';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { BottomSheetFormInput } from '@/components/self-ui/form-input/bottom-sheet-form-input';
import { ThemedBottomSheetModal, ThemedSheetFooter } from '@/components/self-ui/themed-bottom-sheet-modal';
import { designTokens as t } from '@/constants/design-tokens';
import { Action, Copy, Segments, Title } from '@/components/ui/design-system/primitives';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { Server } from '@/features/server/types';
import { validateHost, validatePort } from '@/services/network';
import { BottomSheetModal, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EditServerModalProps {
  serverId: string;
  onRemoved?: () => void;
}

export interface EditServerModalRef {
  present: () => void;
  /** Opens the removal confirmation without presenting the settings sheet. */
  confirmRemove: (kind: 'disconnect' | 'destroy') => void;
}

const MAX_NAME_LENGTH = 30;

export const EditServerModal = forwardRef<EditServerModalRef, EditServerModalProps>((props, ref) => {
  const { serverId } = props;
  const [confirming, setConfirming] = useState<'disconnect' | 'destroy' | null>(null);
  const [removing, setRemoving] = useState(false);
  const removeLock = useRef(false);
  const cloud = useServersStore((state) => state.servers.find((server) => server.id === serverId)?.cloud);
  const insets = useSafeAreaInsets();
  const updateServer = useServersStore((state) => state.updateServer);

  // State management
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8188');
  const [useSSL, setUseSSL] = useState<Server['useSSL']>('Auto');
  const [token, setToken] = useState('');
  const [nameError, setNameError] = useState('');
  const [hostError, setHostError] = useState('');
  const [portError, setPortError] = useState('');

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  // Gorhom cannot dismiss a modal that was never presented (#2669); removal can be confirmed without one.
  const presented = useRef(false);

  // Load server data
  const loadServerData = useCallback(() => {
    const server = useServersStore.getState().servers.find((s) => s.id === serverId);
    if (server) {
      setName(server.name);
      setHost(server.host);
      setPort(server.port.toString());
      setUseSSL(server.useSSL);
      setToken(server.token || '');
    }
  }, [serverId]);

  // Form validation
  const validateName = (value: string) => {
    if (value.length === 0) {
      return 'Name is required';
    }
    if (value.length > MAX_NAME_LENGTH) {
      return `Name must be less than ${MAX_NAME_LENGTH} characters`;
    }
    return '';
  };

  // Save server data
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

  // Close modal and reset form
  /**
   * Cleanup only — no dismiss call. This runs *because* the sheet has already
   * gone, so asking it to go again re-enters the modal's dismissal path and
   * leaves its mount state out of sync, after which present() is silently
   * ignored and the trigger looks dead.
   */
  const handleDismissed = useCallback(() => {
    presented.current = false;
    setNameError('');
    setHostError('');
    setPortError('');
  }, []);

  /** For the buttons: ask the sheet to close. onDismiss does the cleanup. */
  const handleClose = useCallback(() => {
    if (presented.current) bottomSheetModalRef.current?.dismiss();
  }, []);

  // Expose present method
  useImperativeHandle(ref, () => ({
    present: () => {
      loadServerData();
      presented.current = true;
      bottomSheetModalRef.current?.present();
    },
    confirmRemove: (kind) => setConfirming(kind),
  }));

  const renderFooter = (footerProps: BottomSheetFooterProps) => (
    <ThemedSheetFooter {...footerProps}>
      <Action kind="secondary" fill onPress={handleClose}>
        Cancel
      </Action>
      <Action kind="primary" fill onPress={handleSave}>
        Save changes
      </Action>
    </ThemedSheetFooter>
  );

  return (
    <>
      <ThemedBottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        enableDynamicSizing
        footerComponent={renderFooter}
        onDismiss={handleDismissed}
        enablePanDownToClose={true}
        topInset={insets.top}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <AdaptiveScrollView
          keyboardShouldPersistTaps="handled"
          enableFooterMarginAdjustment
          contentContainerStyle={{ paddingHorizontal: t.layout.inset, paddingBottom: insets.bottom + t.layout.inset }}
        >
          <VStack style={{ gap: t.layout.field }}>
            <View style={{ paddingBottom: t.layout.related }}>
              <Title>Server settings</Title>
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

            {cloud && (
              <Action
                kind="secondary"
                onPress={() => {
                  handleClose();
                  router.push({
                    pathname: '/cloud/launch-status/[instanceId]',
                    params: { instanceId: launchKey(cloud) },
                  });
                }}
              >
                Installation details
              </Action>
            )}
          </VStack>
        </AdaptiveScrollView>
      </ThemedBottomSheetModal>
      <ConfirmDialog
        isOpen={confirming !== null}
        destructive
        loading={removing}
        title={confirming === 'destroy' ? 'Destroy instance?' : 'Remove connection?'}
        description={
          confirming === 'destroy'
            ? 'Permanently delete this rented instance and its server files. Compute billing stops after deletion; separately billed storage may remain. Downloaded gallery items stay on this device.'
            : 'Remove this saved connection. The server and provider billing continue. Saved workflow assets and downloaded gallery items stay on this device.'
        }
        confirmText={confirming === 'destroy' ? 'Destroy instance' : 'Remove connection'}
        onClose={() => {
          if (!removeLock.current) setConfirming(null);
        }}
        onConfirm={async () => {
          if (removeLock.current) return;
          removeLock.current = true;
          setRemoving(true);
          try {
            if (confirming === 'destroy' && cloud) {
              const credentials = useCloudCredentialsStore.getState();
              const key = cloud.provider === 'runpod' ? credentials.runpodApiKey : credentials.vastApiKey;
              if (!key) throw new Error('Add your provider key in Cloud accounts before destroying this instance.');
              await destroyCloudInstance(cloud.provider, String(cloud.instanceId), credentials);
              useProvisioningStore.getState().remove(launchKey(cloud));
              const servers = useServersStore.getState();
              servers.servers
                .filter((server) => server.cloud && launchKey(server.cloud) === launchKey(cloud))
                .forEach((server) => servers.removeServer(server.id));
            } else {
              useServersStore.getState().removeServer(serverId);
            }
            setConfirming(null);
            handleClose();
            props.onRemoved?.();
          } catch (error) {
            showToast.error('Could not remove server', error instanceof Error ? error.message : 'Please retry.');
          } finally {
            removeLock.current = false;
            setRemoving(false);
          }
        }}
      />
    </>
  );
});

EditServerModal.displayName = 'EditServerModal';
