import { ServerRow } from '@/features/server/components/server-card';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { LaunchRecord } from '../stores/provisioning-store';
import { formatRentalCost } from '../utils/cost';

const steps: Record<string, string> = {
  'link-directories': 'Preparing folders',
  'disk-check': 'Checking storage',
  aria2: 'Preparing downloads',
  extensions: 'Installing custom nodes',
  ollama: 'Installing Ollama models',
  'comfyui-start': 'Starting ComfyUI',
};

export function launchStatusLine(launch: LaunchRecord): string {
  if (launch.stage === 'failed')
    return `Setup failed · ${launch.error || launch.snapshot?.error?.message || 'Tap to review'}`;
  if (launch.stage === 'ready') return 'Setup complete · Preparing connection';
  if (launch.stage === 'placing') return 'Building · Finding a host';
  if (launch.stage === 'booting') return 'Building · Starting the machine';
  const snapshot = launch.snapshot;
  if (snapshot?.stalled) return 'Building · Download stalled — tap to review';
  const step = snapshot?.steps.find((entry) => entry.state === 'running');
  if (step && steps[step.id]) return `Building · ${steps[step.id]}`;
  const models = snapshot?.models ?? [];
  const done = models.filter((model) => model.state === 'done').length;
  if (models.some((model) => model.state === 'error'))
    return `Building · Model download needs attention (${done}/${models.length})`;
  if (models.length && done < models.length) return `Building · Downloading models ${done}/${models.length}`;
  if (snapshot?.phase === 'starting') return 'Building · Starting ComfyUI';
  return 'Building · Installing environment';
}

export function LaunchCard({ launch, onOpen }: { launch: LaunchRecord; onOpen?: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((v) => v + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const open = onOpen ?? (() => router.navigate(('/cloud/launch-status/' + launch.id) as any));
  return (
    <ServerRow
      name={launch.environmentName}
      origin="Template build"
      endpoint={launch.host ? `${launch.host}${launch.comfyPort ? `:${launch.comfyPort}` : ''}` : 'Address pending'}
      tone={launch.stage === 'failed' ? 'offline' : 'busy'}
      status={launchStatusLine(launch)}
      cost={formatRentalCost(launch)}
      openLabel={`View progress for ${launch.environmentName}`}
      onOpen={open}
    />
  );
}
