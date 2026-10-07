import { RefreshFlatList } from '@/components/ui/design-system/pull-refresh';
import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Field, useDesign } from '@/components/ui/design-system/primitives';
import { Sheet } from '@/components/ui/design-system/overlays';
import { Plus } from '@/constants/icons';
import { useServersStore } from '@/features/server/stores/server-store';
import { ConnectionCard } from '@/features/server/components/connection-card';
import { EditServerModal, type EditServerModalRef } from '@/features/server/components/edit-server-modal';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { compareWorkflowUsage } from '@/features/workflow/utils/workflow-usage';
import { WorkflowCard } from '@/features/workflow/components/workflow-card';
import { ImportWorkflowModal } from '@/features/workflow/components/import-workflow-modal';
import { syncWorkflows } from '@/features/workflow/services/sync-workflows';
import { FilterChips } from '@/components/ui/design-system/filter-chips';
import { designTokens as t } from '@/constants/design-tokens';

export default function ServerScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const router = useRouter();
  const c = useDesign();
  const current = useServersStore((state) => state.servers.find((item) => item.id === serverId));
  // After removal the page slides away; keep showing what it showed rather than "not found".
  const [lastSeen, setLastSeen] = useState(current);
  if (current && current !== lastSeen) setLastSeen(current);
  const server = current ?? lastSeen;
  const all = useWorkflowStore((state) => state.workflow);
  // Editing an endpoint restarts workflow discovery; cached hardware changes do not.
  const connectionIdentity = useMemo(
    () => ({
      id: server?.id,
      host: server?.host,
      port: server?.port,
      useSSL: server?.useSSL,
      token: server?.token,
    }),
    [server?.id, server?.host, server?.port, server?.useSSL, server?.token],
  );
  const editRef = useRef<EditServerModalRef>(null);
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [source, setSource] = useState('all');
  const [syncState, setSyncState] = useState<'checking' | 'ready' | 'unsupported' | 'error'>('checking');
  const hiddenByServer = useWorkflowStore((state) => state.hiddenServerWorkflows);
  const hidden = hiddenByServer[serverId] ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const refreshLock = useRef(false);
  const requestId = useRef(0);
  const serverWorkflows = useMemo(
    () => all.filter((item) => item.serverId === serverId).sort(compareWorkflowUsage),
    [all, serverId],
  );
  const workflows = useMemo(
    () =>
      serverWorkflows.filter(
        (item) =>
          item.name.toLowerCase().includes(query.trim().toLowerCase()) &&
          (source === 'all' ||
            (source === 'server' ? item.addMethod === 'server-sync' : item.addMethod !== 'server-sync')),
      ),
    [serverWorkflows, query, source],
  );
  const refresh = useCallback(() => {
    const connection = useServersStore.getState().servers.find((item) => item.id === serverId);
    // Already refreshing: nothing new is issued. The spinner is cleared anyway,
    // because pull-to-refresh sets it before calling and would otherwise spin
    // forever on the one path that does no work.
    if (!connection || refreshLock.current) {
      setRefreshing(false);
      return Promise.resolve();
    }
    const request = ++requestId.current;
    refreshLock.current = true;
    const isCurrent = () => request === requestId.current;

    setSyncState('checking');
    const workflowSync = syncWorkflows(connection.id).then(
      (result) => {
        if (isCurrent()) {
          setSyncState(result?.state ?? 'ready');
        }
      },
      () => {
        if (isCurrent()) {
          setSyncState('error');
        }
      },
    );

    return Promise.allSettled([workflowSync]).then(() => {
      // Released even for a superseded request: holding the lock after the
      // work has finished would block every later refresh.
      if (isCurrent()) {
        refreshLock.current = false;
        setRefreshing(false);
      }
    });
  }, [serverId]);
  useFocusEffect(
    useCallback(() => {
      if (!connectionIdentity.id) return;
      void refresh();
      return () => {
        requestId.current += 1;
        refreshLock.current = false;
      };
    }, [refresh, connectionIdentity]),
  );

  if (!server)
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <AppBar title="Server" showBack />
        <Copy>Connection not found.</Copy>
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title={server.name}
        titleSize="sm"
        showBack
        rightElement={<Action kind="text" icon={Plus} label="Add workflow" onPress={() => setImporting(true)} />}
      />
      <RefreshFlatList
        testID="server-workflow-list"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={{ gap: 0 }}>
            <View style={{ paddingTop: t.layout.inset, paddingBottom: t.layout.inset }}>
              <ConnectionCard id={serverId} onOpen={() => editRef.current?.present()} />
            </View>
            <View style={{ gap: t.layout.field, paddingBottom: t.layout.field }}>
              <Field label="Search workflows" search value={query} onChange={setQuery} placeholder="Search workflows" />
              <FilterChips
                label="Workflow sources"
                value={source}
                onChange={setSource}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'imported', label: 'Imported' },
                  { value: 'server', label: 'Server' },
                ]}
              />
            </View>
          </View>
        }
        data={workflows}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          return refresh();
        }}
        contentContainerStyle={{
          paddingHorizontal: t.layout.gutter,
          paddingBottom: t.layout.section,
        }}
        renderItem={({ item }) => <WorkflowCard id={item.id} />}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: c.line,
              marginLeft: t.height.touch + t.layout.field,
            }}
          />
        )}
        ListFooterComponent={
          syncState === 'error' || hidden.length > 0 ? (
            <View style={{ paddingTop: t.layout.field, gap: t.layout.related }}>
              {syncState === 'error' && (
                <Copy muted size="metadata">
                  Sync unavailable · Pull to retry.
                </Copy>
              )}
              {hidden.length > 0 && (
                <Action kind="text" small onPress={() => setHiddenOpen(true)}>
                  Hidden workflows ({hidden.length})
                </Action>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View
            style={{
              padding: t.layout.inset,
              gap: t.layout.related,
            }}
          >
            <Copy>{query || source !== 'all' ? 'No matching workflows' : 'No workflows yet'}</Copy>
            <Copy muted>
              {query || source !== 'all'
                ? 'Try another name or source.'
                : syncState === 'unsupported'
                  ? 'Add a workflow, or install Comfy Portal Endpoint to sync server files.'
                  : 'Add a workflow file or pick one from history.'}
            </Copy>
          </View>
        }
      />
      <Sheet open={hiddenOpen} onClose={() => setHiddenOpen(false)} title="Hidden workflows" compactTitle>
        <Copy muted size="label">
          Hidden on this device. Server files and generated results are kept.
        </Copy>
        {hidden.length ? (
          hidden.map((filename) => (
            <View key={filename} style={{ flexDirection: 'row', alignItems: 'center', gap: t.layout.related }}>
              <Copy mono size="label" numberOfLines={2} style={{ flex: 1, minWidth: 0 }}>
                {filename}
              </Copy>
              <Action
                kind="secondary"
                small
                label={`Restore ${filename}`}
                onPress={() => {
                  useWorkflowStore.getState().restoreHiddenServerWorkflow(serverId, filename);
                  void refresh();
                }}
              >
                Restore
              </Action>
            </View>
          ))
        ) : (
          <Copy muted size="label">
            No hidden workflows.
          </Copy>
        )}
      </Sheet>
      <EditServerModal ref={editRef} serverId={serverId} onRemoved={() => router.dismissTo('/')} />
      <ImportWorkflowModal isOpen={importing} onClose={() => setImporting(false)} serverId={serverId} />
    </View>
  );
}
