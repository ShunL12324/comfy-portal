import { Server, Settings2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { Dimensions } from 'react-native';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 2;

type TabRoute = 'server' | 'setting';

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
        <Text
          size="xs"
          className={`mt-0.5 ${isActive ? 'text-typography-950' : 'text-typography-400'}`}
        >
          {label}
        </Text>
      </VStack>
    </Pressable>
  );
};

export const TabBar = ({ activeTab, onChangeTab }: TabBarProps) => {
  return (
    <VStack className={`border-t border-outline-0 bg-background-0`}>
      <HStack space="xs" className="relative">
        <MotiView
          className="absolute h-0.5 rounded-xl bg-typography-950"
          style={{ width: TAB_WIDTH - 80 }}
          animate={{
            translateX: activeTab === 'server' ? 40 : TAB_WIDTH + 40,
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
              className={`${
                activeTab === 'server'
                  ? 'text-typography-950'
                  : 'text-typography-400'
              }`}
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
              className={`${
                activeTab === 'setting'
                  ? 'text-typography-950'
                  : 'text-typography-400'
              }`}
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
