import type { Server } from '@/features/server/types';
import {
  AssetsPlusUnavailableError,
  deleteServerAssets,
  findMissingAssets,
  listServerAssets,
  type GalleryMedia,
} from '@/services/comfy-assets';
import { loadHistoryMedia, removeGeneratedMedia } from '@/services/image-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';

const REFRESH_INTERVAL = 20_000;

export function useAssetGallery(server: Server | undefined, serverId: string, workflowId?: string) {
  const [items, setItems] = useState<GalleryMedia[]>([]);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assetsAvailable, setAssetsAvailable] = useState<boolean>();
  const refresh = useRef<() => void>(() => {});
  const activeRequest = useRef<AbortController | undefined>(undefined);
  const deleting = useRef(false);

  useFocusEffect(useCallback(() => {
    let focused = true;
    let loadedLocal = false;
    const sync = async (showProgress = false) => {
      if (activeRequest.current || deleting.current) return;
      const request = new AbortController();
      activeRequest.current = request;
      const { signal } = request;
      if (showProgress) setRefreshing(true);

      try {
        const local = workflowId ? await loadHistoryMedia(serverId, workflowId) : undefined;
        if (signal.aborted) return;
        if (local && !loadedLocal) {
          setItems(local);
          loadedLocal = true;
        }
        const linked = local?.flatMap((item) => item.outputPath ? [item.outputPath] : []);
        if (local && !linked?.length) {
          setItems(local);
          setError(undefined);
          return;
        }
        if (!server) {
          if (local) setItems(local);
          else setError('Server configuration is unavailable.');
          return;
        }

        try {
          const assets = await listServerAssets(server, signal, showProgress);
          if (signal.aborted) return;
          setAssetsAvailable(true);
          if (!local || !linked || !workflowId) {
            setItems(assets);
          } else {
            const visible = new Set(assets.map((item) => item.outputPath));
            const missing = await findMissingAssets(server, linked.filter((path) => !visible.has(path)), signal);
            if (signal.aborted) return;
            const stillPresent = local.filter((item) => !item.outputPath || !missing.has(item.outputPath));
            setItems(stillPresent);
            await Promise.allSettled(local
              .filter((item) => item.outputPath && missing.has(item.outputPath))
              .map((item) => removeGeneratedMedia(serverId, workflowId, item.url)));
          }
          if (!signal.aborted) setError(undefined);
        } catch (cause) {
          if (signal.aborted) return;
          const unavailable = cause instanceof AssetsPlusUnavailableError;
          if (unavailable) setAssetsAvailable(false);
          if (local) setItems(local);
          setError(local && unavailable
            ? undefined
            : cause instanceof Error ? cause.message : 'Could not refresh assets.');
        }
      } finally {
        if (activeRequest.current === request) {
          activeRequest.current = undefined;
          if (focused) setRefreshing(false);
        }
      }
    };

    const refreshNow = () => void sync(true);
    refresh.current = refreshNow;
    if (AppState.currentState !== 'background') refreshNow();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void sync();
    }, REFRESH_INTERVAL);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshNow();
    });

    return () => {
      focused = false;
      activeRequest.current?.abort();
      activeRequest.current = undefined;
      appState.remove();
      clearInterval(timer);
      refresh.current = () => {};
    };
  }, [server, serverId, workflowId]));

  const deleteItems = async (selected: Set<string>) => {
    if (deleting.current) return new Set<string>();
    deleting.current = true;
    activeRequest.current?.abort();
    activeRequest.current = undefined;
    setRefreshing(false);
    setIsDeleting(true);

    try {
      const targets = items.filter((item) => selected.has(item.url));
      const syncServer = !workflowId || assetsAvailable !== false;
      const paths = syncServer ? targets.flatMap((item) => item.outputPath ? [item.outputPath] : []) : [];
      if (paths.length && !server) throw new Error('Server configuration is unavailable.');
      const removedPaths = paths.length && server ? await deleteServerAssets(server, paths) : new Set<string>();
      // Other entries in this workflow can reference the same output.
      const candidates = items.filter((item) =>
        (item.outputPath && removedPaths.has(item.outputPath)) ||
        (workflowId && selected.has(item.url) && (!syncServer || !item.outputPath)),
      );
      const results = await Promise.allSettled(candidates.map(async (item) => {
        if (workflowId) await removeGeneratedMedia(serverId, workflowId, item.url);
        return item.url;
      }));
      const removed = new Set(results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []));
      setItems((current) => current.filter((item) => !removed.has(item.url)));
      return removed;
    } finally {
      deleting.current = false;
      setIsDeleting(false);
      refresh.current();
    }
  };

  return {
    items, error, refreshing, isDeleting, assetsAvailable, deleteItems,
    refresh: () => refresh.current(),
  };
}
