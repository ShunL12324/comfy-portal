import { View } from 'react-native';
import { Action, Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Check, X } from '@/constants/icons';
import type { LaunchRecord } from '../stores/provisioning-store';
import type { EnvironmentModel } from '../types';
import { formatUsd } from '../utils/cost';
import { formatBytes } from '@/services/model-url';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

type State = 'waiting' | 'running' | 'done' | 'failed';

// Matches the supervisor's name for a model without an explicit filename; a malformed URL falls back to itself.
function modelFilename(model: EnvironmentModel) {
  if (model.filename) return model.filename;
  try {
    return decodeURIComponent(new URL(model.url).pathname.split('/').pop() ?? '') || model.url;
  } catch {
    return model.url;
  }
}
function Step({ label, state, ratio, detail }: { label: string; state: State; ratio?: number; detail?: string }) {
  const c = useDesign();
  const color = state === 'done' ? c.ink : state === 'failed' ? c.danger : c.warning;
  return (
    <View style={{ gap: t.layout.label }}>
      <Row style={{ justifyContent: 'space-between', gap: t.layout.related }}>
        <Copy size="label" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Copy>
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
        <Copy muted size="micro">
          {detail}
        </Copy>
      )}
    </View>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useDesign();
  return (
    <View style={{ padding: t.layout.field, gap: t.layout.field, borderRadius: t.radius.panel, backgroundColor: c.card }}>
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
  const stepState = (id: string): State => snapshot?.steps.find((step) => step.id === id)?.state ?? 'waiting';
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
      <Group title="Base">
        <Step
          label="Allocate server"
          state={launch.stage === 'placing' ? 'running' : launch.stage === 'failed' && !launch.host ? 'failed' : 'done'}
        />
        <Step
          label="Start runtime"
          state={
            launch.stage === 'placing'
              ? 'waiting'
              : launch.stage === 'booting'
                ? 'running'
                : launch.stage === 'failed' && !snapshot
                  ? 'failed'
                  : 'done'
          }
        />
        <Step label="Prepare storage" state={stepState('link-directories')} />
      </Group>
      <Group title="Extensions">
        {(environment?.extensions ?? []).map((url) => (
          <Step
            key={url}
            label={url.replace('https://github.com/', '')}
            state={
              snapshot?.steps.some((step) => step.id === 'extension:' + url)
                ? stepState('extension:' + url)
                : stepState('extensions') === 'done'
                  ? 'done'
                  : 'waiting'
            }
            detail={snapshot?.steps.find((step) => step.id === 'extension:' + url)?.detail}
          />
        ))}
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
          const state: State =
            status?.state === 'done'
              ? 'done'
              : status?.state === 'active'
                ? 'running'
                : status?.state === 'error'
                  ? 'failed'
                  : 'waiting';
          return (
            <View key={model.url} style={{ gap: t.layout.label }}>
              <Step
                label={model.label || model.filename || model.url}
                state={state}
                ratio={status && status.total > 0 ? status.completed / status.total : undefined}
                detail={
                  status?.error ||
                  (status
                    ? `${formatBytes(status.completed)} / ${status.total ? formatBytes(status.total) : 'Size unavailable'}`
                    : undefined)
                }
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
          <Step key={index} label={workflow.name} state={launch.workflowProgress?.[String(index)] ?? 'waiting'} />
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
            <Step key={model} label={model} state={stepState('ollama:' + model)} />
          ))}
        </Group>
      )}
      <Group title="Startup checks">
        <Step label="Start ComfyUI" state={stepState('comfyui-start')} />
        <Step
          label="Verify connection"
          state={launch.stage === 'ready' ? 'done' : snapshot?.phase === 'ready' ? 'running' : 'waiting'}
        />
      </Group>
    </View>
  );
}
