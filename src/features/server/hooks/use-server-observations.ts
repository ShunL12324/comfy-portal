import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useServersStore } from '../stores/server-store';

/** Card observations stop off-screen/background; catalogue and workflow sync are independent. */
export function useServerObservations() {
  const identity = useServersStore((state) =>
    JSON.stringify(state.servers.map(({ id, host, port, useSSL, token }) => ({ id, host, port, useSSL, token }))),
  );
  useFocusEffect(
    useCallback(() => {
      let controller: AbortController | undefined;
      let timer: ReturnType<typeof setInterval> | undefined;
      const stop = () => {
        clearInterval(timer);
        controller?.abort();
      };
      const start = () => {
        stop();
        controller = new AbortController();
        const read = () => {
          for (const server of JSON.parse(identity) as { id: string }[])
            void useServersStore.getState().observeServer(server.id, controller!.signal);
        };
        read();
        timer = setInterval(read, 5_000);
      };
      if (AppState.currentState === 'active') start();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') start();
        else stop();
      });
      return () => {
        stop();
        subscription.remove();
      };
    }, [identity]),
  );
}
