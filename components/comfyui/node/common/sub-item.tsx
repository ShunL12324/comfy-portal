import { Text } from '@/components/ui/text';
import { ReactNode } from 'react';
import { View } from 'react-native';

interface SubItemProps {
  title: string;
  children?: ReactNode;
  className?: string;
  rightComponent?: ReactNode;
}

export default function SubItem({ title, children, className, rightComponent }: SubItemProps) {
  return (
    <View className={`mt-4 ${className}`}>
      <View className="mb-1 flex-row items-center justify-between">
        <Text size="sm" className="text-typography-700">
          {title}
        </Text>
        {rightComponent}
      </View>
      {children && <View>{children}</View>}
    </View>
  );
}
