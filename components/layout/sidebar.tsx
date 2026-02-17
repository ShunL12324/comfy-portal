import { useThemeColor } from '@/hooks/useThemeColor';
import { Server, Settings2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';
import { type TabRoute } from './tab-bar';

interface SidebarItemProps {
  icon: typeof Server;
  label: string;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColor>;
}

interface SidebarProps {
  activeTab: TabRoute;
  onChangeTab: (tab: TabRoute) => void;
}

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_WIDTH_RATIO = 0.25;

const SidebarItem = ({ icon, label, isActive, onPress, colors }: SidebarItemProps) => {
  return (
    <Pressable onPress={onPress} className="rounded-xl">
      <MotiView
        animate={{
          backgroundColor: isActive ? colors.background[100] : 'transparent',
        }}
        transition={{ type: 'timing', duration: 200 }}
        style={{ borderRadius: 12 }}
      >
        <HStack space="md" className="items-center px-3 py-2.5">
          <Icon
            as={icon}
            size="lg"
            className={isActive ? 'text-typography-950' : 'text-typography-400'}
          />
          <Text
            size="md"
            className={isActive ? 'font-medium text-typography-950' : 'text-typography-400'}
          >
            {label}
          </Text>
        </HStack>
      </MotiView>
    </Pressable>
  );
};

export const Sidebar = ({ activeTab, onChangeTab }: SidebarProps) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColor();
  const { width } = useWindowDimensions();
  const sidebarWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width * SIDEBAR_WIDTH_RATIO));

  return (
    <VStack
      className="border-r border-outline-0 bg-background-0"
      style={{ width: sidebarWidth, paddingTop: insets.top }}
    >
      {/* Navigation items */}
      <VStack space="xs" className="px-3 pt-4">
        <SidebarItem
          icon={Server}
          label="Servers"
          isActive={activeTab === 'server'}
          onPress={() => onChangeTab('server')}
          colors={colors}
        />
        <SidebarItem
          icon={Settings2}
          label="Settings"
          isActive={activeTab === 'setting'}
          onPress={() => onChangeTab('setting')}
          colors={colors}
        />
      </VStack>

      {/* Bottom safe area padding */}
      <VStack style={{ height: insets.bottom }} />
    </VStack>
  );
};
