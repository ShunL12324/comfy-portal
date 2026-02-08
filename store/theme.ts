import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'
import { useColorScheme } from 'nativewind'

type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  /** User's theme preference */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

/**
 * Returns the resolved color scheme ('light' | 'dark') based on user preference.
 * When preference is 'system', follows the OS color scheme.
 *
 * Uses NativeWind's useColorScheme with a synchronous Appearance.getColorScheme()
 * fallback. On cold start, NativeWind's observable may not have the system value
 * yet (returns undefined), so we read the native Appearance directly to avoid
 * a brief flash of the wrong theme.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference)
  const { colorScheme: nwColorScheme } = useColorScheme()
  if (preference !== 'system') {
    return preference
  }
  return nwColorScheme ?? Appearance.getColorScheme() ?? 'light'
}
