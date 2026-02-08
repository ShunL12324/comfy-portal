import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
 * Uses NativeWind's useColorScheme instead of RN's useColorScheme because on
 * RN 0.83+, after Appearance.setColorScheme(null) (which NativeWind calls when
 * color scheme is set to 'system'), RN's useColorScheme() returns null until
 * the native appearanceChanged event fires asynchronously. NativeWind's own
 * observable system handles this correctly via its Appearance.addChangeListener.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference)
  const { colorScheme: nwColorScheme } = useColorScheme()
  if (preference !== 'system') {
    return preference
  }
  return nwColorScheme ?? 'light'
}
