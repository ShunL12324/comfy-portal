import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useCloudCredentialsStore } from '../stores/credentials-store';
import { useProvisioningStore } from '../stores/provisioning-store';
import { useTemplateStore } from '../stores/template-store';
import { advanceLaunch } from '../services/provision';

/** Slow enough not to hammer a phone's radio, fast enough to feel live. */
const INTERVAL_MS = 4_000;

/**
 * Drives every unfinished launch forward.
 *
 * Mounted once high in the tree rather than by the launch screen: an install
 * runs for tens of minutes and bills throughout, so it has to keep progressing
 * whether or not anyone is looking at it. On a cold start this is also what
 * reattaches to instances that were still installing when the app was last
 * closed.
 */
export function useLaunchPoller() {
  const hydrated = useCloudCredentialsStore((s) => s.hydrated);
  const busy = useRef(false);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    const tick = async () => {
      // Polling while suspended is pointless — iOS freezes the timer anyway,
      // and the first foreground tick catches up in one request.
      if (busy.current || AppState.currentState !== 'active') return;
      const active = useProvisioningStore.getState().active();
      if (active.length === 0) return;

      const credentials = useCloudCredentialsStore.getState();
      if (!credentials.vastApiKey) return;

      busy.current = true;
      try {
        for (const launch of active) {
          if (cancelled) break;
          const template = useTemplateStore.getState().getTemplate(launch.templateId);
          try {
            await advanceLaunch(launch.instanceId, credentials, template);
          } catch {
            // A dropped poll is not a failed launch — the machine carries on
            // installing, and the next tick picks it up.
          }
        }
      } finally {
        busy.current = false;
      }
    };

    void tick();
    const timer = setInterval(tick, INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void tick();
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [hydrated]);
}
