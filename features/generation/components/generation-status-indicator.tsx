import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Copy, Row, Status, useDesign } from '@/components/ui/design-system/primitives';
import { MotiView } from 'moti';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { designTokens as t } from '@/constants/design-tokens';

/**
 * Props for the ServerStatus component
 */
interface ServerStatusProps {
  /** Whether the server is currently generating media */
  generating: boolean;
  /** Whether the server is currently downloading media */
  downloading?: boolean;
  /** Download progress percentage (0-100) */
  downloadProgress?: number;
  /** Generation progress information */
  generationProgress?: {
    value: number;
    max: number;
  };
  /** Node execution progress */
  nodeProgress?: {
    completed: number;
    total: number;
  };
  currentNodeId?: string;
  currentNodeName?: string;
}

/**
 * Displays active generation and saving progress
 * Shows different states:
 * - Generating with progress (yellow)
 * - Downloading with progress (blue)
 */
export function ServerStatus({
  generating,
  downloading = false,
  downloadProgress = 0,
  generationProgress,
  nodeProgress,
  currentNodeId,
  currentNodeName,
}: ServerStatusProps) {
  const c = useDesign();
  const reduced = useReducedMotion();
  if (!generating && !downloading) return null;
  const ratio = downloading
    ? downloadProgress / 100
    : generationProgress?.max
      ? generationProgress.value / generationProgress.max
      : undefined;
  const percent = ratio === undefined ? undefined : Math.max(0, Math.min(100, ratio * 100));
  return (
    <View style={{ gap: t.layout.label }}>
      <Row style={{ justifyContent: 'space-between', gap: t.layout.related }}>
        {generating && nodeProgress && nodeProgress.total > 0 ? (
          <Copy muted size="metadata">
            Nodes {nodeProgress.completed} / {nodeProgress.total}
          </Copy>
        ) : (
          <Status
            state={downloading ? 'downloading' : 'busy'}
            label={downloading ? 'Saving' : 'Generating'}
            pulse={false}
            size="metadata"
          />
        )}
      </Row>
      {(generating || downloading) && (
        <Row style={{ justifyContent: 'space-between', gap: t.layout.related }}>
          <Copy size="label" numberOfLines={1} style={{ flex: 1 }}>
            {downloading
              ? 'Saving outputs'
              : currentNodeName || (currentNodeId ? 'Node ' + currentNodeId : 'Waiting for execution')}
          </Copy>
          {percent === undefined ? (
            <RotatingSpinner size="sm" color={c.warning} />
          ) : (
            <Copy muted size="metadata">
              {downloading
                ? Math.round(percent) + '%'
                : generationProgress!.value + ' / ' + generationProgress!.max + ' steps'}
            </Copy>
          )}
        </Row>
      )}
      {(generating || downloading) && percent !== undefined && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={downloading ? 'Saving output files' : 'Current node steps'}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
          style={{ width: '100%', height: 3, backgroundColor: c.line, overflow: 'hidden' }}
        >
          <MotiView
            key={downloading ? 'saving' : (currentNodeId ?? 'steps')}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'timing', duration: reduced ? 0 : 240 }}
            style={{ height: 3, backgroundColor: c.warning }}
          />
        </View>
      )}
    </View>
  );
}
