import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'

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
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference)
  const systemColorScheme = useColorScheme()
  return preference === 'system'
    ? (systemColorScheme ?? 'light')
    : preference
}
