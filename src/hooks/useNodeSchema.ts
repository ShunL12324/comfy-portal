import {
  NodeSchema,
  getNodeSchema,
  getNodeSchemaCacheVersion,
  subscribeNodeSchemaCache,
} from '@/services/node-schema';
import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Load a node's definition from its server.
 *
 * Returns `null` while loading and when unavailable (server offline, older
 * ComfyUI, node not installed) — callers are expected to fall back to
 * rendering from the workflow values alone.
 */
export function useNodeSchema(serverId: string | undefined, classType: string | undefined) {
  const [schema, setSchema] = useState<NodeSchema | null>(null);
  // Refetch when the cache is invalidated, not just when the node changes.
  const cacheVersion = useSyncExternalStore(
    subscribeNodeSchemaCache,
    getNodeSchemaCacheVersion,
    getNodeSchemaCacheVersion,
  );

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
  }, [serverId, classType, cacheVersion]);

  return schema;
}
