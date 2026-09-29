import { useRouter } from 'expo-router';
import { Fact, ListCard } from '@/components/ui/design-system/list-card';
import { spoken } from '@/utils/spoken';
import type { Environment } from '@/features/cloud/types';
import { environmentSummary } from '@/features/cloud/utils/environment-summary';

/** An environment card opens its recipe; hardware rental starts from the detail page. */
export function EnvironmentCard({ environment }: { environment: Environment }) {
  const router = useRouter();
  const summary = environmentSummary(environment);
  return (
    <ListCard
      testID="environment-card"
      title={environment.name}
      subtitle={environment.description.trim() || 'No description yet'}
      wrapFacts={false}
      distributeFacts
      accessibilityLabel={`Open ${environment.name}`}
      accessibilityHint={spoken(summary.models.text, summary.extensions.text, summary.workflows.text)}
      onPress={() => router.navigate(`/templates/${environment.id}`)}
      facts={
        <>
          {[summary.models, summary.extensions, summary.workflows].map((item, index) => (
            <Fact
              key={item.label}
              value={String(item.count)}
              label={item.label}
              testID={`environment-${['model', 'extension', 'workflow'][index]}-count`}
            />
          ))}
        </>
      }
    />
  );
}
