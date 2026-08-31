import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Link, type Href } from 'expo-router';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import type { ReactNode } from 'react';

interface SettingRowProps {
  icon: LucideIcon;
  label: string;
  /** Navigates on press. Mutually exclusive with `onPress`. */
  href?: Href;
  onPress?: () => void;
  /** Replaces the trailing chevron — a Switch, a value, a badge. */
  right?: ReactNode;
  /** Turns the chevron a quarter turn, for rows that expand in place. */
  expanded?: boolean;
}

/**
 * A row on a settings screen.
 *
 * Rows are separated by their own 16px of vertical padding — there are no
 * divider lines, which is what keeps a long settings list quiet.
 */
export function SettingRow({ icon, label, href, onPress, right, expanded }: SettingRowProps) {
  const body = (
    <Pressable className="py-4" onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Icon as={icon} size="lg" className="mr-3 text-action" />
          <Text className="text-base font-medium text-content-heading">{label}</Text>
        </View>
        {right ?? (
          <MotiView
            animate={{ rotate: expanded ? '90deg' : '0deg' }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Icon as={ChevronRight} size="sm" className="text-content-tertiary" />
          </MotiView>
        )}
      </View>
    </Pressable>
  );

  return href ? (
    <Link href={href} asChild>
      {body}
    </Link>
  ) : (
    body
  );
}
