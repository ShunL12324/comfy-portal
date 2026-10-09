import { getBuiltInEnvironment, type BuiltInEnvironment } from '../built-in';
import { useEnvironmentStore } from '../stores/environment-store';
import type { Environment } from '../types';

/**
 * The recipe behind an environment route: one of the user's environments, or
 * a built-in example. An example is read-only; `example` says which it is.
 */
export function useEnvironmentRecipe(id: string | undefined): {
  environment: Environment | undefined;
  example: BuiltInEnvironment | undefined;
} {
  const example = getBuiltInEnvironment(id);
  const stored = useEnvironmentStore((state) =>
    example ? undefined : state.environments.find((item) => item.id === id),
  );
  return { environment: example?.environment ?? stored, example };
}
