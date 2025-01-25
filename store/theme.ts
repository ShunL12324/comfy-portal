import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ColorSchemeName } from 'react-native'

interface ThemeState {
  theme: ColorSchemeName
  systemTheme: ColorSchemeName
  isSystemTheme: boolean
  setTheme: (theme: ColorSchemeName) => void
  setSystemTheme: (theme: ColorSchemeName) => void
  toggleTheme: () => void
  useSystemTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      systemTheme: 'light',
      isSystemTheme: true,

      setTheme: (theme) => set({ theme, isSystemTheme: false }),

      setSystemTheme: (theme) => {
        set({ systemTheme: theme })
        if (get().isSystemTheme) {
          set({ theme })
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme
        set({
          theme: currentTheme === 'dark' ? 'light' : 'dark',
          isSystemTheme: false,
        })
      },

      useSystemTheme: () => {
        set({
          isSystemTheme: true,
          theme: get().systemTheme,
        })
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
) 