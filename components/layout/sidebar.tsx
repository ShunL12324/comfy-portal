import { Server, Settings2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
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
}

interface SidebarProps {
  activeTab: TabRoute;
  onChangeTab: (tab: TabRoute) => void;
}

const SIDEBAR_WIDTH = 240;

const SidebarItem = ({ icon, label, isActive, onPress }: SidebarItemProps) => {
  return (
    <Pressable onPress={onPress} className="rounded-xl">
      <MotiView
        animate={{
          backgroundColor: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
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

  return (
    <VStack
      className="border-r border-outline-0 bg-background-0"
      style={{ width: SIDEBAR_WIDTH, paddingTop: insets.top }}
    >
      {/* App title */}
      <HStack className="px-5 pb-4 pt-4">
        <Text size="xl" className="font-bold text-typography-950">
          Comfy Portal
        </Text>
      </HStack>

      {/* Navigation items */}
      <VStack space="xs" className="flex-1 px-3 pt-2">
        <SidebarItem
          icon={Server}
          label="Servers"
          isActive={activeTab === 'server'}
          onPress={() => onChangeTab('server')}
        />

        {/* Spacer pushes Settings to bottom */}
        <VStack className="flex-1" />

        <SidebarItem
          icon={Settings2}
          label="Settings"
          isActive={activeTab === 'setting'}
          onPress={() => onChangeTab('setting')}
        />
      </VStack>

      {/* Bottom safe area padding */}
      <VStack style={{ height: insets.bottom }} />
    </VStack>
  );
};
