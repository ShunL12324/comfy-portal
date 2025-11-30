import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';

export function useThemeColor() {
  const { theme } = useThemeStore();
  return Colors[theme === 'dark' ? 'dark' : 'light'];
}
