import { Fact, ListCard } from '@/components/ui/design-system/list-card';
import { Copy, Meter, Status } from '@/components/ui/design-system/primitives';
import { ServerOriginBadge, type ServerOrigin } from '@/components/ui/design-system/server-origin-badge';
import { View } from '@/components/ui/view';
import { designTokens as t } from '@/constants/design-tokens';
import { formatBytes } from '@/services/model-url';
import { formatRentalCost } from '@/features/cloud/utils/cost';
import { useServersStore } from '@/features/server/stores/server-store';
import { serverGpuSummary, serverHint, serverStatus, type ServerTone } from '@/features/server/utils/server-summary';
import { spoken } from '@/utils/spoken';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

interface ServerRowProps {
  name: string;
  origin: ServerOrigin;
  endpoint: string;
  status: string;
  tone: ServerTone;
  gpuName?: string;
  gpuNames?: string[];
  /** The running rental estimate, shown wherever a rented machine is listed. */
  cost?: string;
  openLabel?: string;
  onOpen: () => void;
  memoryUsed?: number;
  memoryTotal?: number;
}

/**
 * Shared by every lifecycle state in the unified server list: connected
 * servers, template builds in progress and failed builds share name, origin,
 * address and an unpartitioned resource summary.
 */
export function ServerRow({
  name,
  origin,
  endpoint,
  status,
  tone,
  gpuName,
  gpuNames,
  cost,
  openLabel,
  onOpen,
  memoryUsed,
  memoryTotal,
}: ServerRowProps) {
  const gpu = serverGpuSummary(gpuNames, gpuName);
  const memory = memoryUsed !== undefined && memoryTotal !== undefined && memoryTotal > 0;
  const memoryLabel = memory ? `${formatBytes(memoryUsed)} / ${formatBytes(memoryTotal)}` : undefined;
  return (
    <ListCard
      testID="server-row"
      title={name}
      subtitle={endpoint}
      subtitleMono
      factsAlignment="flex-end"
      wrapFacts={!gpu && !memory}
      metaMaxWidth={gpu || memory ? '55%' : undefined}
      metaWidth={gpu || memory ? '55%' : undefined}
      badge={<ServerOriginBadge origin={origin} />}
      accessibilityLabel={openLabel ?? `Open ${name}`}
      accessibilityHint={spoken(
        origin,
        serverHint({ label: status }, undefined, cost),
        gpu,
        memoryLabel ? `VRAM${(gpuNames?.length ?? 0) > 1 ? ' GPU 1' : ''}: ${memoryLabel}` : undefined,
      )}
      onPress={onOpen}
      facts={
        <View style={{ flexShrink: 1, minWidth: 0, gap: t.layout.label }}>
          {cost && (gpu || memory) ? <Fact value={cost} /> : null}
          <View testID="server-status-line" style={{ flexShrink: 1, minWidth: 0 }}>
            <Status state={tone} label={status} size="label" numberOfLines={1} />
          </View>
        </View>
      }
      meta={
        gpu || memory ? (
          <View style={{ minWidth: 0, gap: t.layout.label }}>
            {gpu ? (
              <Copy
                testID="server-gpu"
                size="label"
                numberOfLines={1}
                style={{ fontWeight: '500', textAlign: 'right' }}
              >
                {gpu}
              </Copy>
            ) : null}
            {memory && (
              <View
                testID="server-card-vram"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: t.layout.related,
                }}
              >
                <View style={{ width: t.card.meterWidth }}>
                  <Meter
                    value={(memoryUsed! / memoryTotal!) * 100}
                    label={`VRAM usage: ${name}${(gpuNames?.length ?? 0) > 1 ? ', GPU 1' : ''}`}
                  />
                </View>
                <Copy mono muted size="metadata" numberOfLines={1} style={{ textAlign: 'right', flexShrink: 1 }}>
                  {(gpuNames?.length ?? 0) > 1 ? 'GPU 1 · ' : ''}
                  {memoryLabel}
                </Copy>
              </View>
            )}
          </View>
        ) : cost ? (
          <Fact value={cost} />
        ) : undefined
      }
    />
  );
}

export function ServerCard({ id }: { id: string }) {
  const [, tick] = useState(0);
  const server = useServersStore((s) => s.servers.find((entry) => entry.id === id));
  useEffect(() => {
    if (!server?.cloud) return;
    const timer = setInterval(() => tick((v) => v + 1), 60_000);
    return () => clearInterval(timer);
  }, [server?.cloud]);
  if (!server) return null;
  const { name, host, port, status, latency, cloud, gpuName, gpuNames } = server;
  const summary = serverStatus(status, latency);
  const metrics = status === 'online' ? server.metrics : undefined;
  return (
    <ServerRow
      name={name}
      origin={cloud ? 'Template build' : 'Manual'}
      endpoint={`${host}:${port}`}
      tone={summary.tone}
      status={summary.label}
      gpuName={gpuName}
      gpuNames={gpuNames}
      cost={cloud ? formatRentalCost(cloud) : undefined}
      onOpen={() => router.push(`/workflow/${id}`)}
      memoryUsed={metrics?.memoryUsed}
      memoryTotal={metrics?.memoryTotal}
    />
  );
}
