import { totalModelBytes, type Environment, type EnvironmentModel } from '@/features/cloud/types';
import { formatBytes } from '@/services/model-url';
import { counted } from '@/utils/counted';
import { spoken } from '@/utils/spoken';

export interface EnvironmentSize {
  text: string;
  /** Numeric readouts are mono; the unavailable notice is prose. */
  mono: boolean;
}

/**
 * Disk footprint of the recipe's models. Nothing when there are no models,
 * and an honest notice when any model's size is unknown: partial sums must
 * never read as a total.
 */
export function environmentSize(models: EnvironmentModel[]): EnvironmentSize | undefined {
  if (!models.length) return undefined;
  const bytes = totalModelBytes(models);
  return bytes ? { text: formatBytes(bytes), mono: true } : { text: 'Size unavailable', mono: false };
}

type Counted = ReturnType<typeof counted>;

export interface EnvironmentSummary {
  models: Counted;
  extensions: Counted;
  workflows: Counted;
  size?: EnvironmentSize;
  /** Spoken form for the card's accessibility hint. */
  hint: string;
}

export function environmentSummary(
  environment: Pick<Environment, 'models' | 'extensions' | 'workflows'>,
): EnvironmentSummary {
  const models = counted(environment.models.length, 'model', 'models');
  const extensions = counted(environment.extensions.length, 'extension', 'extensions');
  const workflows = counted(environment.workflows.length, 'workflow', 'workflows');
  const size = environmentSize(environment.models);
  return {
    models,
    extensions,
    workflows,
    size,
    hint: spoken(models.text, extensions.text, workflows.text, size?.text),
  };
}
