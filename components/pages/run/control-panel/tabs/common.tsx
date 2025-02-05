import { Text } from '@/components/ui/text';
import { View } from 'react-native';

interface TabItemProps {
  title: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
}
export function TabItem({ title, titleRight, children }: TabItemProps) {
  return (
    <View className="flex-col gap-2 overflow-hidden">
      <View className="flex-row items-center justify-between">
        <Text size="sm" bold>
          {title}
        </Text>
        {titleRight && titleRight}
      </View>
      {children}
    </View>
  );
}
