import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Action, Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Check, X } from '@/constants/icons';
import type { LaunchRecord } from '../stores/provisioning-store';
import type { EnvironmentModel } from '../types';
import { formatUsd } from '../utils/cost';
import {
  boxClockOffset,
  formatDuration,
  formatElapsed,
  fromSupervisorStep,
  hostWarning,
  openingSteps,
  type SetupStep,
  type StepState,
} from '../utils/launch-steps';
import { formatBytes } from '@/services/model-url';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

// Matches the supervisor's name for a model without an explicit filename; a malformed URL falls back to itself.
function modelFilename(model: EnvironmentModel) {
  if (model.filename) return model.filename;
  try {
    return decodeURIComponent(new URL(model.url).pathname.split('/').pop() ?? '') || model.url;
  } catch {
    return model.url;
  }
}

/** The current time, once a second while something is running: the timers' clock. */
function useNow(ticking: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}

function Step({ step, now }: { step: SetupStep; now: number }) {
  const c = useDesign();
  const { label, state, ratio, detail, ms } = step;
  // A running step without a start time from the instance (an older
  // supervisor, a workflow upload) is timed from when this screen saw it start.
  const [seen, setSeen] = useState({ state, at: state === 'running' ? now : undefined });
  if (seen.state !== state) setSeen({ state, at: state === 'running' ? now : undefined });
  const startedAt = step.startedAt ?? seen.at;
  const color = state === 'done' ? c.ink : state === 'failed' ? c.danger : c.warning;
  const clock =
    state === 'running' && startedAt !== undefined
      ? formatElapsed(now - startedAt)
      : state === 'done' && ms !== undefined
        ? formatDuration(ms)
        : undefined;
  return (
    <View style={{ gap: t.layout.label }}>
      <Row style={{ justifyContent: 'space-between', gap: t.layout.related }}>
        <Copy size="label" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Copy>
        {!!clock && (
          <Copy mono muted size="micro" accessibilityLabel={state === 'running' ? `Elapsed ${clock}` : `Took ${clock}`}>
            {clock}
          </Copy>
        )}
        {state === 'done' ? (
          <Check size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={color} />
        ) : state === 'failed' ? (
          <X size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={color} />
        ) : state === 'running' ? (
          <RotatingSpinner size="sm" color={color} />
        ) : (
          <Copy muted size="micro">
            Pending
          </Copy>
        )}
      </Row>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={
          state === 'done'
            ? { min: 0, max: 100, now: 100 }
            : ratio === undefined
              ? { text: state }
              : { min: 0, max: 100, now: Math.round(ratio * 100) }
        }
        style={{ height: 3, backgroundColor: c.line, overflow: 'hidden' }}
      >
        <View
          style={{
            height: 3,
            width: `${state === 'done' ? 100 : Math.max(0, Math.min(100, (ratio ?? 0) * 100))}%`,
            backgroundColor: color,
          }}
        />
      </View>
      {!!detail && (
        <Copy mono muted size="micro">
          {detail}
        </Copy>
      )}
    </View>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useDesign();
  return (
    <View
      style={{ padding: t.layout.field, gap: t.layout.field, borderRadius: t.radius.panel, backgroundColor: c.card }}
    >
      <Copy size="body" style={{ fontWeight: '500' }}>
        {title}
      </Copy>
      {children}
    </View>
  );
}
export function LaunchProgress({
  launch,
  retryModel,
  retrying,
}: {
  launch: LaunchRecord;
  retryModel?: (key: string) => void;
  retrying?: string;
}) {
  const snapshot = launch.snapshot;
  const environment = launch.environmentSnapshot;
  const settled = launch.stage === 'ready' || launch.stage === 'failed';
  const now = useNow(!settled);
  const offset = boxClockOffset(snapshot, launch.snapshotAt);
  const step = (id: string, label: string) =>
    fromSupervisorStep(
      snapshot?.steps.find((item) => item.id === id),
      label,
      offset,
      id,
    );
  const warning = hostWarning(launch, now);
  const base: SetupStep[] = [
    ...openingSteps(launch),
    step('link-directories', 'Prepare storage'),
    ...(environment?.models.length || snapshot?.steps.some((item) => item.id === 'disk-check')
      ? [step('disk-check', 'Check disk space')]
      : []),
    step('aria2', 'Start downloader'),
  ];
  const extensionsDone = snapshot?.steps.find((item) => item.id === 'extensions')?.state === 'done';
  const requirements = snapshot?.steps.find((item) => item.id === 'extensions:requirements');
  const comfyStep = snapshot?.steps.find((item) => item.id === 'comfyui-start');
  return (
    <View style={{ gap: t.layout.field }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Copy>{launch.environmentName}</Copy>
        <Copy mono muted size="metadata">
          {launch.priceScope === 'gpu-starting' ? 'GPU from ' : ''}
          {formatUsd(launch.pricePerHour)}/hr
        </Copy>
      </Row>
      {!!launch.error && <Copy accessibilityRole="alert">{launch.error}</Copy>}
      {!!warning && <Copy accessibilityRole="alert">{warning}</Copy>}
      <Group title="Base">
        {base.map((item) => (
          <Step key={item.id} step={item} now={now} />
        ))}
      </Group>
      <Group title="Extensions">
        {(environment?.extensions ?? []).map((url) => {
          const own = snapshot?.steps.find((item) => item.id === 'extension:' + url);
          const item = fromSupervisorStep(own, url.replace('https://github.com/', ''), offset, url);
          return <Step key={url} step={!own && extensionsDone ? { ...item, state: 'done' } : item} now={now} />;
        })}
        {!!requirements && (
          <Step step={fromSupervisorStep(requirements, 'Install Python requirements', offset)} now={now} />
        )}
        {!environment?.extensions.length && (
          <Copy muted size="metadata">
            No extensions required
          </Copy>
        )}
      </Group>
      <Group title="Models">
        {(environment?.models ?? []).map((model) => {
          const filename = modelFilename(model);
          const status = snapshot?.models.find((item) => item.folder === model.type && item.name === filename);
          const state: StepState =
            status?.state === 'done'
              ? 'done'
              : status?.state === 'active'
                ? 'running'
                : status?.state === 'error'
                  ? 'failed'
                  : 'waiting';
          const bytes = status
            ? `${formatBytes(status.completed) || '0 MB'} / ${status.total ? formatBytes(status.total) : 'Size unavailable'}`
            : undefined;
          return (
            <View key={model.url} style={{ gap: t.layout.label }}>
              <Step
                now={now}
                step={{
                  id: model.url,
                  label: model.label || model.filename || model.url,
                  state,
                  ratio: status && status.total > 0 ? status.completed / status.total : undefined,
                  startedAt: status?.startedAt ? status.startedAt + offset : undefined,
                  ms:
                    status?.startedAt && status.finishedAt && status.finishedAt >= status.startedAt
                      ? status.finishedAt - status.startedAt
                      : undefined,
                  detail:
                    status?.error ||
                    (bytes && state === 'running' && status?.speed
                      ? `${bytes} · ${formatBytes(status.speed)}/s`
                      : state === 'waiting' && status
                        ? `Queued · ${bytes}`
                        : bytes),
                }}
              />
              {state === 'failed' && status && retryModel && (
                <Row>
                  <Action
                    small
                    kind="secondary"
                    loading={retrying === status.folder + '/' + status.name}
                    disabled={!!retrying}
                    onPress={() => retryModel(status.folder + '/' + status.name)}
                  >
                    Retry download
                  </Action>
                </Row>
              )}
            </View>
          );
        })}
        {!environment?.models.length && (
          <Copy muted size="metadata">
            No model downloads required
          </Copy>
        )}
      </Group>
      <Group title="Workflows">
        {(environment?.workflows ?? []).map((workflow, index) => (
          <Step
            key={index}
            now={now}
            step={{
              id: String(index),
              label: workflow.name,
              state: launch.workflowProgress?.[String(index)] ?? 'waiting',
              detail: launch.workflowProgress?.[String(index)] === 'running' ? 'Saving to the server' : undefined,
            }}
          />
        ))}
        {!environment?.workflows.length && (
          <Copy muted size="metadata">
            No workflows included
          </Copy>
        )}
      </Group>
      {!!environment?.ollamaModels?.length && (
        <Group title="Ollama models">
          {environment.ollamaModels.map((model) => (
            <Step key={model} now={now} step={step('ollama:' + model, model)} />
          ))}
        </Group>
      )}
      <Group title="Startup checks">
        <Step
          now={now}
          step={{
            ...step('comfyui-start', 'Start ComfyUI'),
            detail:
              comfyStep?.state === 'running'
                ? 'Waiting for ComfyUI to answer'
                : !comfyStep && snapshot?.services.comfyui
                  ? snapshot.services.comfyui.state === 'running'
                    ? 'Already answering; checked once the models are in'
                    : 'Starting while the models download'
                  : undefined,
          }}
        />
        <Step
          now={now}
          step={{
            id: 'verify',
            label: 'Verify connection',
            state: launch.stage === 'ready' ? 'done' : snapshot?.phase === 'ready' ? 'running' : 'waiting',
            detail: launch.stage !== 'ready' && snapshot?.phase === 'ready' ? 'Adding the server' : undefined,
          }}
        />
      </Group>
    </View>
  );
}
