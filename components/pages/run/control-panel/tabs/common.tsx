import { Text } from '@/components/ui/text';
import { Pressable, View } from 'react-native';

interface TabItemProps {
  title: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
}

export function TabItem({ title, titleRight, children }: TabItemProps) {
  return (
    <View className="flex flex-col gap-3 overflow-hidden">
      <View className="flex-row items-start justify-between">
        <Text size="sm" bold className="">
          {title}
        </Text>
        {titleRight && titleRight}
      </View>
      {children}
    </View>
  );
}

interface TagItemProps {
  tag: string;
  strength: number;
  selected: boolean;
  onSelect: () => void;
}

export const getStrengthColor = (strength: number) => {
  if (strength <= 0.5) return 'text-success-400'; // soft green
  if (strength <= 0.8) return 'text-success-500'; // standard green
  if (strength <= 1.0) return 'text-success-600'; // dark green
  if (strength <= 1.2) return 'text-warning-400'; // soft yellow
  if (strength <= 1.5) return 'text-warning-500'; // standard yellow
  if (strength <= 1.8) return 'text-error-400'; // soft red
  if (strength <= 2.0) return 'text-error-500'; // standard red
  if (strength <= 2.3) return 'text-error-600'; // dark red
  return 'text-error-700'; // darkest red
};

export function TagItem({ tag, strength, selected, onSelect }: TagItemProps) {
  return (
    <View
      className={`h-8 flex-row items-center gap-[0.5px] rounded-full border px-2 ${
        selected ? 'border-primary-700 bg-background-200' : 'border-transparent bg-background-50'
      }`}
    >
      <Pressable onPress={onSelect} className="flex-row items-center">
        <Text size="sm" className="px-2 py-1 text-typography-900">
          {tag}
        </Text>
        <Text size="sm" className={`${getStrengthColor(strength)}`} bold>
          {strength.toFixed(1)}
        </Text>
      </Pressable>
    </View>
  );
}
