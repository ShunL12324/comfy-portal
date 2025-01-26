import React from 'react';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';
import { Text } from '../ui/text';
import { Pressable } from '../ui/pressable';
import { Home, Send, Settings2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Dimensions } from 'react-native';
import { AnimatePresence } from 'moti';
import { useThemeStore } from '@/store/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 2;

type TabRoute = 'home' | 'setting';

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
          className={`mt-0.5 ${isActive ? 'text-primary-900' : 'text-secondary-500'}`}
        >
          {label}
        </Text>
      </VStack>
    </Pressable>
  );
};

export const TabBar = ({ activeTab, onChangeTab }: TabBarProps) => {
  const { theme } = useThemeStore();
  return (
    <VStack
      className={`border-t border-secondary-200 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}
    >
      <HStack space="xs" className="relative">
        <MotiView
          className="absolute h-0.5 bg-primary-900"
          style={{ width: TAB_WIDTH - 80 }}
          animate={{
            translateX: activeTab === 'home' ? 40 : TAB_WIDTH + 40,
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
        />
        <TabItem
          icon={
            <Home
              size={20}
              className={
                activeTab === 'home' ? 'text-primary-900' : 'text-secondary-500'
              }
            />
          }
          label="Home"
          isActive={activeTab === 'home'}
          onPress={() => onChangeTab('home')}
        />
        <TabItem
          icon={
            <Settings2
              size={20}
              className={
                activeTab === 'setting'
                  ? 'text-primary-900'
                  : 'text-secondary-500'
              }
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
