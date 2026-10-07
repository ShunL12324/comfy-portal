import { AppBar } from '@/components/layout/app-bar';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { EmptyState } from '@/components/self-ui/empty-state';
import { Sheet } from '@/components/ui/design-system/overlays';
import { Action, Copy, Field, Row, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { ChevronRight, GitBranch, Trash2 } from '@/constants/icons';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import type { WorkflowAsset } from '@/features/workflow/types';
import { workflowUsageLabel } from '@/features/workflow/utils/workflow-usage';
import { showToast } from '@/utils/toast';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HistoryRow {
  asset: WorkflowAsset;
  /** Names of the servers whose list holds this workflow now. */
  servers: string[];
  lastUsed?: Date;
}

const nodeCount = (asset: WorkflowAsset) => Object.keys(asset.data).length;

function serverSummary(servers: string[]) {
  if (!servers.length) return 'Not on any server';
  return servers.length === 1 ? `On ${servers[0]}` : `On ${servers.length} servers`;
}

/**
 * Every workflow this device keeps: ones added or run on any server, including
 * ones since removed from a server's list. The Add workflow sheet's "From
 * History" picks from the same set.
 */
export default function HistoryWorkflows() {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const assets = useWorkflowStore((state) => state.assets);
  const bindings = useWorkflowStore((state) => state.bindings);
  const servers = useServersStore((state) => state.servers);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  const rows = useMemo<HistoryRow[]>(() => {
    const serverName = new Map(servers.map((server) => [server.id, server.name]));
    return assets
      .map((asset) => {
        const own = bindings.filter((binding) => binding.assetId === asset.id);
        const used = own.map((binding) => (binding.lastUsed ? Date.parse(binding.lastUsed) : 0)).filter(Boolean);
        return {
          asset,
          servers: [...new Set(own.map((binding) => serverName.get(binding.serverId)).filter(Boolean) as string[])],
          lastUsed: used.length ? new Date(Math.max(...used)) : undefined,
        };
      })
      .sort(
        (a, b) =>
          (b.lastUsed?.getTime() ?? 0) - (a.lastUsed?.getTime() ?? 0) ||
          Date.parse(b.asset.updatedAt) - Date.parse(a.asset.updatedAt),
      );
  }, [assets, bindings, servers]);

  const needle = query.trim().toLowerCase();
  const visible = needle ? rows.filter((row) => row.asset.name.toLowerCase().includes(needle)) : rows;
  const open = rows.find((row) => row.asset.id === openId);

  const remove = () => {
    if (!open) return;
    useWorkflowStore.getState().removeAsset(open.asset.id);
    setConfirming(false);
    setOpenId(undefined);
    showToast.success('Workflow deleted from history');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar title="History workflows" titleSize="sm" showBack />
      {rows.length ? (
        <>
          <View style={{ paddingHorizontal: t.layout.gutter, paddingBottom: t.layout.field, gap: t.layout.related }}>
            <Copy muted size="metadata">
              Every workflow added or run on this device, including ones removed from a server. Add one to a server with
              Add workflow → From History.
            </Copy>
            <Field
              label="Search history workflows"
              search
              value={query}
              onChange={setQuery}
              placeholder="Search workflows"
            />
          </View>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: t.layout.gutter,
              paddingBottom: t.layout.section + insets.bottom,
              gap: t.layout.list,
            }}
          >
            {visible.map(({ asset, servers: on, lastUsed }) => (
              <Pressable
                key={asset.id}
                accessibilityRole="button"
                accessibilityLabel={asset.name}
                onPress={() => setOpenId(asset.id)}
                style={{
                  paddingHorizontal: t.layout.rowX,
                  paddingVertical: t.layout.rowY,
                  minHeight: 64,
                  borderRadius: t.radius.panel,
                  backgroundColor: c.card,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.layout.related,
                }}
              >
                <View
                  style={{
                    width: t.height.touch,
                    height: t.height.touch,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: c.raised,
                    borderRadius: t.radius.small,
                    overflow: 'hidden',
                  }}
                >
                  {asset.thumbnail ? (
                    <Image
                      source={{ uri: asset.thumbnail }}
                      style={{ width: t.height.touch, height: t.height.touch }}
                      contentFit="cover"
                    />
                  ) : (
                    <GitBranch size={t.icon.large} color={c.secondary} strokeWidth={iconStroke(t.icon.large)} />
                  )}
                </View>
                <View style={{ flex: 1, gap: t.layout.label }}>
                  <Copy numberOfLines={1}>{asset.name}</Copy>
                  <Copy muted size="metadata" numberOfLines={1}>
                    {nodeCount(asset)} nodes · {serverSummary(on)} · {workflowUsageLabel(lastUsed)}
                  </Copy>
                </View>
                <ChevronRight size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={c.muted} />
              </Pressable>
            ))}
            {!visible.length && <Copy muted>No workflows match “{query.trim()}”.</Copy>}
          </ScrollView>
        </>
      ) : (
        <EmptyState align="center" title="No history workflows yet">
          Workflows you add or run on a server are kept here.
        </EmptyState>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(undefined)} title={open?.asset.name ?? 'Workflow'}>
        {open && (
          <>
            <Copy muted size="metadata">
              {serverSummary(open.servers)} · {workflowUsageLabel(open.lastUsed)}
            </Copy>
            {open.servers.length > 1 && <Copy size="label">{open.servers.join(', ')}</Copy>}
            <Copy size="label">Nodes · {nodeCount(open.asset)}</Copy>
            <View
              style={{
                gap: t.layout.label,
                padding: t.layout.related,
                borderRadius: t.radius.control,
                backgroundColor: c.card,
              }}
            >
              {Object.entries(open.asset.data).map(([nodeId, node]) => (
                <Row key={nodeId} style={{ minHeight: t.height.small, gap: t.layout.related }}>
                  <Copy mono muted size="micro">
                    {nodeId.padStart(2, '0')}
                  </Copy>
                  <Copy size="metadata" numberOfLines={1} style={{ flex: 1 }}>
                    {node._meta?.title || node.class_type}
                  </Copy>
                </Row>
              ))}
            </View>
            <Action kind="secondary" destructive icon={Trash2} fill onPress={() => setConfirming(true)}>
              Delete from history
            </Action>
          </>
        )}
      </Sheet>
      <ConfirmDialog
        isOpen={confirming}
        destructive
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title="Delete from history?"
        description={
          open?.servers.length
            ? `It is also removed from ${open.servers.length === 1 ? open.servers[0] : `${open.servers.length} servers`}. Generated results in the gallery are kept.`
            : 'It can no longer be added from history. Generated results in the gallery are kept.'
        }
        confirmText="Delete"
      />
    </View>
  );
}
