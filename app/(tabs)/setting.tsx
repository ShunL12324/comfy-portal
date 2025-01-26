import { useThemeStore } from '@/store/theme';
import { View } from 'react-native';

export default function ExploreScreen() {
  const { theme } = useThemeStore();
  return (
    <View
      className={`flex-1 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}
    ></View>
  );
}
