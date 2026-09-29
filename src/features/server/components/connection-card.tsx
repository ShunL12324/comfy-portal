import { useDesign } from '@/components/ui/design-system/primitives';
import { ChevronRight } from '@/constants/icons';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { formatRentalCost } from '@/features/cloud/utils/cost';
import { ServerRow } from '@/features/server/components/server-card';
import { useServersStore } from '@/features/server/stores/server-store';
import { serverStatus } from '@/features/server/utils/server-summary';

/**
 * The connection itself, at the top of its server page. The name is already in
 * the AppBar, so the card leads with the address; a tap opens the connection
 * sheet, which is where editing and removal live.
 */
export function ConnectionCard({ id, onOpen }: { id: string; onOpen: () => void }) {
  const c = useDesign();
  const server = useServersStore((s) => s.servers.find((entry) => entry.id === id));
  if (!server) return null;
  const { host, port, status, latency, cloud, gpuName, gpuNames } = server;
  const summary = serverStatus(status, latency);
  const metrics = status === 'online' ? server.metrics : undefined;
  return (
    <ServerRow
      name={`${host}:${port}`}
      endpoint={cloud ? 'Template build' : 'Manual connection'}
      badge={<ChevronRight size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={c.muted} />}
      tone={summary.tone}
      status={summary.label}
      gpuName={gpuName}
      gpuNames={gpuNames}
      cost={cloud ? formatRentalCost(cloud) : undefined}
      openLabel="Connection settings"
      onOpen={onOpen}
      memoryUsed={metrics?.memoryUsed}
      memoryTotal={metrics?.memoryTotal}
    />
  );
}
