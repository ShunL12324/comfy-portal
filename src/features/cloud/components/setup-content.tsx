import { designTokens as t } from '@/constants/design-tokens';
import { Check } from '@/constants/icons';
import { useCloudCredentialsStore } from '../stores/credentials-store';
import { destroyManagedInstance, isInstanceDestroying, removeLocalInstanceRecord } from '../services/instance-destruction';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Action, Copy } from '@/components/ui/design-system/primitives';
import { Sheet } from '@/components/ui/design-system/overlays';
import { LaunchProgress } from './launch-progress';
import { useProvisioningStore, type LaunchRecord } from '../stores/provisioning-store';
import { getLog, getStatus, retryModels } from '@/services/ssh-supervisor';

export function SetupContent({ launch, onDestroyed }: { launch: LaunchRecord; onDestroyed?: () => void }) {
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [destroyed, setDestroyed] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [removed, setRemoved] = useState(false);
  const finished = destroyed || removed;
  const [destroyError, setDestroyError] = useState('');
  const [cleanupWarning, setCleanupWarning] = useState('');
  const destroyLock = useRef(false);
  const destroy = async () => {
    if (destroyLock.current) return;
    destroyLock.current = true;
    setDestroying(true);
    setDestroyError('');
    try {
      if (localOnly) {
        await removeLocalInstanceRecord(launch);
        setRemoved(true);
      } else {
        const result = await destroyManagedInstance(launch, useCloudCredentialsStore.getState());
        setCleanupWarning(result.cleanupWarning ?? '');
        setDestroyed(true);
      }
    } catch (cause) {
      setDestroyError(cause instanceof Error ? cause.message : localOnly ? 'Could not save the removal. Try again.' : 'Could not destroy the instance. Try again.');
    } finally {
      destroyLock.current = false;
      setDestroying(false);
    }
  };
  const [logOpen, setLogOpen] = useState(false);
  const [retrying, setRetrying] = useState<string>();
  const [error, setError] = useState('');
  const retryLock = useRef(false);
  const { id, sshHost, sshPort, token } = launch;
  useEffect(() => {
    if (!sshHost || !sshPort || finished) return;
    let active = true;
    let polling = false;
    const poll = async () => {
      if (polling || isInstanceDestroying(id)) return;
      polling = true;
      try {
        const snapshot = await getStatus({ sshHost, sshPort, token });
        if (active && !isInstanceDestroying(id)) useProvisioningStore.getState().update(id, { snapshot });
      } catch {
        /* The launch poller handles connection recovery. */
      } finally {
        polling = false;
      }
    };
    void poll();
    const timer = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, sshHost, sshPort, token, finished]);
  const retry = async (key: string) => {
    if (!sshHost || !sshPort || retryLock.current || destroyLock.current) return;
    retryLock.current = true;
    setRetrying(key);
    setError('');
    try {
      const result = await retryModels({ sshHost, sshPort, token }, [key]);
      if (!result.retried?.includes(key))
        throw new Error('This download was not queued. Refresh its status and try again.');
      const snapshot = await getStatus({ sshHost, sshPort, token });
      useProvisioningStore.getState().update(id, { snapshot });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not retry this download.');
    } finally {
      retryLock.current = false;
      setRetrying(undefined);
    }
  };
  return (
    <>
    <View style={{ gap: t.layout.field }}>
      <LaunchProgress launch={launch} retryModel={retry} retrying={retrying} />
      {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
      <View style={{ gap: t.layout.related }}>
      <Action onPress={() => setLogOpen(true)}>
        View installation log
      </Action>
      <Action destructive={!destroyed} icon={destroyed ? Check : undefined} kind="primary" loading={destroying} disabled={destroying} onPress={() => { setLocalOnly(false); setDestroyError(''); setConfirmDestroy(true); }}>
        {destroying ? 'Destroying instance…' : destroyed ? 'Instance destroyed' : 'Destroy instance'}
      </Action>
      </View>
    </View>
    <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="Installation log"
      stackBehavior="push" snapPoints={['75%']} compactTitle>
      {logOpen && <InstallationLog key={id} launch={launch} />}
    </Sheet>
    <Sheet open={confirmDestroy} onClose={() => setConfirmDestroy(false)}
      onDismiss={() => { if (finished) onDestroyed?.(); }}
      dismissible={!destroying} stackBehavior="push" compactTitle
      title={removed ? 'Local record removed' : destroyed ? 'Instance destroyed' : localOnly ? 'Remove local record?' : destroyError ? 'Destruction not confirmed' : 'Stop setup and destroy instance?'}>
      <Copy muted>{removed
        ? 'The setup record and its saved connection have been removed from this app. No cloud resources were destroyed.'
        : destroyed
        ? 'The provider confirms this instance no longer exists. Its connection has been removed. Separate storage is unchanged.'
        : localOnly
        ? `Remove ${launch.environmentName} (${launch.provider} · ${launch.instanceId}) from this app only. This does not destroy the cloud instance or stop billing. Any running instance must be managed in your provider dashboard.`
        : destroyError
        ? 'Cloud destruction could not be confirmed. Cancel to keep this record and try again later, or remove only the local record.'
        : `This stops installation and permanently destroys ${launch.environmentName} (${launch.provider} · ${launch.instanceId}) and its instance disk data. This cannot be undone. Separate storage may continue billing.`}</Copy>
      {!!(destroyError || cleanupWarning) && <Copy accessibilityRole="alert">{destroyError || cleanupWarning}</Copy>}
      <View style={{ gap: t.layout.related }}>
        <Action kind="primary" fill destructive={!finished} icon={finished ? Check : undefined}
          loading={destroying} disabled={destroying}
          onPress={finished ? () => setConfirmDestroy(false) : destroyError && !localOnly ? () => {
            setLocalOnly(true); setDestroyError('');
          } : destroy}>
          {destroying ? localOnly ? 'Removing local record…' : 'Destroying instance…' : removed ? 'Local record removed' : destroyed ? 'Instance destroyed' : localOnly ? 'Remove from this app' : destroyError ? 'Remove local record only' : 'Destroy instance'}
        </Action>
        <Action kind="secondary" fill disabled={destroying} onPress={() => setConfirmDestroy(false)}>
          {finished ? 'Back to Servers' : 'Cancel'}
        </Action>
      </View>
    </Sheet>
    </>
  );
}

function InstallationLog({ launch }: { launch: LaunchRecord }) {
  const { sshHost, sshPort, token } = launch;
  const [log, setLog] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function read() {
      try {
        const text = sshHost && sshPort
          ? await getLog({ sshHost, sshPort, token })
          : 'Installation logs will be available after the runtime starts.';
        if (active) { setLog(text || 'No log entries yet.'); setError(''); }
      } catch {
        if (active) setError('Could not read the installation log. Try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void read();
    return () => { active = false; };
  }, [sshHost, sshPort, token, revision]);
  return <View style={{ gap: t.layout.field }}>
    <Action kind="secondary" loading={loading} disabled={loading} onPress={() => {
      setLoading(true); setRevision(value => value + 1);
    }}>Refresh log</Action>
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    <Copy mono size="metadata" selectable>{loading && !log ? 'Loading installation log…' : log}</Copy>
  </View>;
}
