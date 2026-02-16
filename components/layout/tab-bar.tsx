import { Server, Settings2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

const NUM_TABS = 2;

export type TabRoute = 'server' | 'explore' | 'setting';

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

interface TabBarProps {
  activeTab: TabRoute;
  onChangeTab: (tab: TabRoute) => void;
}

const TabItem = ({ icon, label, isActive, onPress }: TabItemProps) => {
  return (
    <Pressable onPress={onPress} className="flex-1">
      <VStack space="xs" className="items-center pb-3 pt-4">
        {icon}
        <Text size="xs" className={`mt-0.5 ${isActive ? 'text-typography-950' : 'text-typography-400'}`}>
          {label}
        </Text>
      </VStack>
    </Pressable>
  );
};

export const TabBar = ({ activeTab, onChangeTab }: TabBarProps) => {
  const { width } = useWindowDimensions();
  const tabWidth = width / NUM_TABS;

  const getTranslateX = (tab: TabRoute) => {
    switch (tab) {
      case 'server':
        return 40;
      case 'explore':
        return tabWidth + 40;
      case 'setting':
        return tabWidth + 40;
      default:
        return 40;
    }
  };

  return (
    <VStack className={`border-t border-outline-0 bg-background-0`}>
      <HStack space="xs" className="relative">
        <MotiView
          className="absolute h-0.5 rounded-xl bg-typography-950"
          style={{ width: tabWidth - 80 }}
          animate={{
            translateX: getTranslateX(activeTab),
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
        />
        <TabItem
          icon={
            <Icon
              as={Server}
              size="lg"
              className={`${activeTab === 'server' ? 'text-typography-950' : 'text-typography-400'}`}
            />
          }
          label="Server"
          isActive={activeTab === 'server'}
          onPress={() => onChangeTab('server')}
        />
        <TabItem
          icon={
            <Icon
              as={Settings2}
              size="lg"
              className={`${activeTab === 'setting' ? 'text-typography-950' : 'text-typography-400'}`}
            />
          }
          label="Setting"
          isActive={activeTab === 'setting'}
          onPress={() => onChangeTab('setting')}
        />
      </HStack>
    </VStack>
  );
};
