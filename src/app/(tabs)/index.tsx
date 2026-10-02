import { Sheet } from '@/components/ui/design-system/overlays';
import { SetupContent } from '@/features/cloud/components/setup-content';
import { designTokens as t } from '@/constants/design-tokens';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Field, useDesign } from '@/components/ui/design-system/primitives';
import { RefreshScrollView } from '@/components/ui/design-system/pull-refresh';
import { View } from '@/components/ui/view';
import { LaunchCard } from '@/features/cloud/components/launch-card';
import { useProvisioningStore, launchKey, type LaunchRecord } from '@/features/cloud/stores/provisioning-store';
import { AddServerModal, type AddServerModalRef } from '@/features/server/components/add-server-modal';
import { EditServerModal, type EditServerModalRef } from '@/features/server/components/edit-server-modal';
import { EmptyState } from '@/components/self-ui/empty-state';
import { EmptyServersArt } from '@/features/server/components/empty-servers-art';
import { ServerCard } from '@/features/server/components/server-card';
import { useServersStore } from '@/features/server/stores/server-store';
import { Plus } from '@/constants/icons';
import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useServerObservations } from '@/features/server/hooks/use-server-observations';

export default function HomeScreen() {
  useServerObservations();
  const c = useDesign();
  const refreshLock = useRef(false);
  const addRef = useRef<AddServerModalRef>(null);
  const editRef = useRef<EditServerModalRef>(null);
  // One shared Connection sheet; a fresh object re-presents it for the same server.
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  useEffect(() => {
    // Present after the render that hands the sheet its serverId, so it loads that server.
    if (editing) editRef.current?.present();
  }, [editing]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const { servers, refreshServer } = useServersStore();
  const launches = useProvisioningStore((s) => s.launches);
  const entries = [
    ...launches.map((launch) => ({
      launch,
      server: servers.find((server) => server.cloud && launchKey(server.cloud) === launch.id),
    })),
    ...servers
      .filter((server) => !launches.some((launch) => server.cloud && launch.id === launchKey(server.cloud)))
      .map((server) => ({ server, launch: undefined })),
  ];
  const [setupSelection, setSetupSelection] = useState<LaunchRecord | null>(null);
  const setup = setupSelection ? (launches.find((item) => item.id === setupSelection.id) ?? setupSelection) : null;
  const count = entries.length;
  const searchTerm = query.trim().toLowerCase();
  const filtered = entries.filter(({ launch, server }) => {
    const pending = launch && (launch.stage !== 'ready' || !server);
    const name = pending ? launch.environmentName : server?.name;
    const host = pending ? launch.host : server?.host;
    const port = pending ? launch.comfyPort : server?.port;
    return `${name ?? ''} ${host ?? ''}${port ? `:${port}` : ''}`.toLowerCase().includes(searchTerm);
  });
  const refresh = async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    Keyboard.dismiss();
    setRefreshing(true);
    setError('');
    try {
      await Promise.all(servers.map((s) => refreshServer(s.id)));
    } catch {
      setError('Some connections could not be refreshed. Try again.');
    } finally {
      refreshLock.current = false;
      setRefreshing(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title="Servers"
        titleCount={count}
        rightElement={<Action icon={Plus} label="Add server" onPress={() => addRef.current?.present()} />}
      />
      <View style={{ flex: 1 }}>
        <RefreshScrollView
          refreshing={refreshing}
          onRefresh={refresh}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: t.layout.gutter,
            paddingBottom: t.layout.gutter,
            gap: t.layout.inset,
          }}
        >
          {count > 0 && (
            <Field label="Search servers" search value={query} onChange={setQuery} placeholder="Search servers" />
          )}
          {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
          <View style={{ flex: count > 0 ? undefined : 1, gap: t.layout.related }}>
            {filtered.length ? (
              <View style={{ gap: t.layout.list }}>
                {filtered.map(({ launch, server }) => {
                  const key = launch ? `instance-${launch.instanceId}` : server!.id;
                  return launch && (launch.stage !== 'ready' || !server) ? (
                    <LaunchCard key={key} launch={launch} onOpen={() => setSetupSelection(launch)} />
                  ) : (
                    <ServerCard key={key} id={server!.id} onLongPress={(id) => setEditing({ id })} />
                  );
                })}
              </View>
            ) : searchTerm ? (
              <View style={{ paddingVertical: t.layout.section, gap: t.layout.label }}>
                <Copy>No matching servers</Copy>
                <Copy muted>Try another name or address.</Copy>
              </View>
            ) : (
              <EmptyState
                testID="servers-empty"
                align="center"
                art={<EmptyServersArt />}
                title="No servers yet"
                hint="Tap + to add a server."
              >
                Connect ComfyUI on your computer or a cloud machine to use its workflows here.
              </EmptyState>
            )}
          </View>
        </RefreshScrollView>
      </View>
      <AddServerModal ref={addRef} />
      <EditServerModal ref={editRef} serverId={editing?.id ?? ''} />
      <Sheet open={!!setup} onClose={() => setSetupSelection(null)} title="Setup" centerTitle>
        {setup && <SetupContent launch={setup} onDestroyed={() => setSetupSelection(null)} />}
      </Sheet>
    </View>
  );
}
