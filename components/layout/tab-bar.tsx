import React from 'react';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';
import { Text } from '../ui/text';
import { Pressable } from '../ui/pressable';
import { Home, Send } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Dimensions } from 'react-native';
import { AnimatePresence } from 'moti';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 2;

type TabRoute = 'home' | 'explore';

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
        <MotiView
          animate={{
            scale: isActive ? 1.05 : 1,
            translateY: isActive ? -3 : 0,
          }}
          transition={{
            type: 'spring',
            damping: 20,
            mass: 0.9,
            stiffness: 120,
          }}
        >
          {icon}
        </MotiView>
        <Text
          size="sm"
          className={`mt-0.5 ${isActive ? 'text-primary-900' : 'text-secondary-500'}`}
        >
          {label}
        </Text>
        <AnimatePresence>
          {isActive && (
            <MotiView
              from={{
                opacity: 0,
                scale: 0,
                translateY: -3,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                translateY: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0,
                translateY: 3,
              }}
              transition={{
                type: 'spring',
                damping: 20,
                mass: 0.9,
                stiffness: 120,
              }}
              className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary-900"
            />
          )}
        </AnimatePresence>
      </VStack>
    </Pressable>
  );
};

export const TabBar = ({ activeTab, onChangeTab }: TabBarProps) => {
  return (
    <VStack className="border-t border-secondary-200 bg-background-0">
      <HStack space="xs" className="relative">
        <MotiView
          className="absolute h-0.5 bg-primary-900"
          style={{ width: TAB_WIDTH - 80 }}
          animate={{
            translateX: activeTab === 'home' ? 40 : TAB_WIDTH + 40,
            scale: [1, 1.1, 1],
          }}
          transition={{
            type: 'spring',
            damping: 20,
            mass: 0.8,
            stiffness: 150,
            scale: {
              type: 'timing',
              duration: 250,
            },
          }}
        />
        <TabItem
          icon={
            <Home
              size={24}
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
            <Send
              size={24}
              className={
                activeTab === 'explore'
                  ? 'text-primary-900'
                  : 'text-secondary-500'
              }
            />
          }
          label="Explore"
          isActive={activeTab === 'explore'}
          onPress={() => onChangeTab('explore')}
        />
      </HStack>
    </VStack>
  );
};
