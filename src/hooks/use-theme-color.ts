import { Colors } from '@/constants/colors';
import { useResolvedTheme } from '@/store/theme';

export function useThemeColor() {
  const theme = useResolvedTheme();
  return Colors[theme === 'dark' ? 'dark' : 'light'];
}
