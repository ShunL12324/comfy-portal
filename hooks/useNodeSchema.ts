import { NodeSchema, getNodeSchema } from '@/services/node-schema';
import { useEffect, useState } from 'react';

/**
 * Load a node's definition from its server.
 *
 * Returns `null` while loading and when unavailable (server offline, older
 * ComfyUI, node not installed) — callers are expected to fall back to
 * rendering from the workflow values alone.
 */
export function useNodeSchema(serverId: string | undefined, classType: string | undefined) {
  const [schema, setSchema] = useState<NodeSchema | null>(null);

  useEffect(() => {
    if (!serverId || !classType) return;
    let cancelled = false;

    getNodeSchema(serverId, classType)
      .then((result) => {
        if (!cancelled) setSchema(result);
      })
      .catch(() => {
        // Schema is an enhancement; the caller still renders without it.
      });

    return () => {
      cancelled = true;
    };
  }, [serverId, classType]);

  return schema;
}
