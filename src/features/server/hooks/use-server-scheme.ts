import type { Server } from '@/features/server/types';
import { knownScheme, subscribeSchemes, type Scheme } from '@/services/server-scheme';
import { useSyncExternalStore } from 'react';

/** The scheme this connection uses, or undefined while `Auto` has not found one yet. */
export function useServerScheme(server: Pick<Server, 'host' | 'port' | 'useSSL'> | undefined): Scheme | undefined {
  const learned = useSyncExternalStore(subscribeSchemes, () =>
    server ? knownScheme(server.host, server.port) : undefined,
  );
  if (!server) return undefined;
  if (server.useSSL === 'Always') return 'https';
  if (server.useSSL === 'Never') return 'http';
  return learned;
}
