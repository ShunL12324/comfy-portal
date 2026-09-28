import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'
import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

/** The order the Settings switcher walks through. */
export const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark']

interface ThemeState {
  /** User's theme preference */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  /** Advances to the next preference in THEME_CYCLE. */
  cyclePreference: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // A fresh install opens in Dark. 'system' remains a fully valid stored
      // value, so anyone already on it keeps following the OS — the default is
      // the only thing this changed.
      preference: 'dark',
      setPreference: (preference) => set({ preference }),
      cyclePreference: () =>
        set((s) => {
          const next = THEME_CYCLE[(THEME_CYCLE.indexOf(s.preference) + 1) % THEME_CYCLE.length]
          return { preference: next }
        }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // All three values are legal, so there is nothing to convert. This is a
      // pass-through purely so pre-version records are accepted rather than
      // discarded; never fold 'system' into a concrete value here, or everyone
      // who follows the OS silently loses that.
      migrate: (persisted) => persisted as ThemeState,
    }
  )
)

const subscribeToAppearance = (onChange: () => void) => {
  const subscription = Appearance.addChangeListener(onChange)
  return () => subscription.remove()
}
const readAppearance = () => Appearance.getColorScheme() ?? 'light'

/**
 * Returns the resolved color scheme ('light' | 'dark') based on user preference.
 * When preference is 'system', follows the OS color scheme.
 *
 * The OS value is read through a subscription, not a one-off call: someone
 * sitting on 'system' has to repaint when they flip appearance in Control
 * Centre, and the whole app reads its theme through this hook.
 *
 * Deliberately not NativeWind's useColorScheme here. That observable can hold
 * a stale value while the platform has already moved, and reading it first
 * ('nativewind ?? appearance') means the stale value wins and the repaint
 * never happens. Appearance is the platform's own answer, it is correct
 * synchronously on cold start, and subscribing to it keeps it current.
 * NativeWind's own scheme is still driven by GluestackUIProvider for the
 * `dark:` class layer; this hook is the JS-side resolver.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference)
  const systemScheme = useSyncExternalStore(subscribeToAppearance, readAppearance, readAppearance)
  if (preference !== 'system') {
    return preference
  }
  return systemScheme === 'dark' ? 'dark' : 'light'
}
