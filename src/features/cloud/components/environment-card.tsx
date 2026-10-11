import { useRouter } from 'expo-router';
import { Fact, ListCard } from '@/components/ui/design-system/list-card';
import { spoken } from '@/utils/spoken';
import type { Environment } from '@/features/cloud/types';
import { environmentSummary } from '@/features/cloud/utils/environment-summary';
import { Box, GitBranch, Puzzle } from '@/constants/icons';

/** The same glyphs as the environment page's sections, so a badge points at its section. */
const FACTS = [
  { key: 'models', icon: Box, testID: 'environment-model-count' },
  { key: 'extensions', icon: Puzzle, testID: 'environment-extension-count' },
  { key: 'workflows', icon: GitBranch, testID: 'environment-workflow-count' },
] as const;

/** An environment card opens its recipe; hardware rental starts from the detail page. */
export function EnvironmentCard({
  environment,
  onLongPress,
}: {
  environment: Environment;
  /** Opens Edit environment, like a server card's Connection sheet. */
  onLongPress?: (id: string) => void;
}) {
  const router = useRouter();
  const summary = environmentSummary(environment);
  return (
    <ListCard
      testID="environment-card"
      title={environment.name}
      subtitle={environment.description.trim() || 'No description yet'}
      subtitleLines={3}
      wrapFacts
      accessibilityLabel={`Open ${environment.name}`}
      accessibilityHint={spoken(summary.models.text, summary.extensions.text, summary.workflows.text)}
      onPress={() => router.navigate(`/templates/${environment.id}`)}
      onLongPress={onLongPress ? () => onLongPress(environment.id) : undefined}
      longPressLabel={onLongPress ? 'Edit environment' : undefined}
      facts={
        <>
          {FACTS.map(({ key, icon, testID }) => (
            <Fact
              key={key}
              badge
              icon={icon}
              value={String(summary[key].count)}
              label={summary[key].label}
              testID={testID}
            />
          ))}
        </>
      }
    />
  );
}
