import { Copy, Row } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { designTokens as t } from '@/constants/design-tokens';
import { ImageIcon } from '@/constants/icons';
import { useGenerationProgress, useGenerationStatus } from '@/features/generation/context/generation-context';
import { View } from 'react-native';

/** The result area before any output exists: idle hint, or generation and saving progress. */
export function ResultPlaceholder() {
  const { status } = useGenerationStatus();
  const { progress, nodeProgress, downloadProgress } = useGenerationProgress();
  return (
    <View
      className="bg-surface-base"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: t.layout.section,
        gap: t.layout.related,
      }}
    >
      <Row style={{ gap: t.layout.related }}>
        {status !== 'idle' ? (
          <Spinner size="small" />
        ) : (
          <Icon as={ImageIcon} size="sm" className="text-content-secondary" />
        )}
        <Copy>
          {status === 'generating'
            ? 'Generating output'
            : status === 'downloading'
              ? 'Saving results'
              : 'Your results appear here'}
        </Copy>
      </Row>
      <Copy muted size="label" style={{ textAlign: 'center' }}>
        {status === 'generating'
          ? nodeProgress.total > 0
            ? `${nodeProgress.completed} / ${nodeProgress.total} nodes complete`
            : 'Waiting for the server to begin execution.'
          : status === 'downloading'
            ? `${Math.round(downloadProgress)}% of output files saved`
            : 'Adjust the workflow below, then generate.'}
      </Copy>
      {status === 'generating' && progress.max > 0 && (
        <Copy mono muted size="metadata">
          Step {progress.value} / {progress.max} · current node
        </Copy>
      )}
    </View>
  );
}
