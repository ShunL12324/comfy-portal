import { AppBar } from '@/components/layout/app-bar';
import { View, Text } from 'react-native';

export default function ExploreScreen() {
  return (
    <View className={`flex-1 bg-background-0`}>
      <AppBar title="Setting" />
      <View className="flex-1 bg-background-0">
        <Text>Setting</Text>
      </View>
    </View>
  );
}
