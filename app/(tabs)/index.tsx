import React, { useState, useEffect, useRef } from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { ServerCard } from '@/components/server-card';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button } from '@/components/ui/button';
import { Plus, RotateCw } from 'lucide-react-native';
import { HStack } from '@/components/ui/hstack';
import { useServersStore } from '@/store/servers';
import { View } from '@/components/ui/view';
import { Animated, Easing } from 'react-native';
import { AddServerModal } from '@/components/add-server-modal';
import { AppBar } from '@/components/layout/app-bar';
import { useThemeStore } from '@/store/theme';

export default function HomeScreen() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { servers, refreshServer } = useServersStore();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleRefreshServers = async () => {
    servers.forEach((s) => {
      refreshServer(s.id).then;
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const { theme } = useThemeStore();

  return (
    <View className={`flex-1 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
      <AppBar
        title="Servers"
        bottomElement={
          <HStack space="sm" className="items-center">
            <Button
              variant="solid"
              action="primary"
              size="md"
              className="h-11 flex-1 rounded-xl bg-background-50 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={() => setIsAddModalOpen(true)}
            >
              <HStack space="sm" className="items-center justify-center">
                <Plus size={18} className="text-primary-500" />
                <Text className="text-sm font-medium text-primary-500">
                  Add Server
                </Text>
              </HStack>
            </Button>
            <Button
              variant="solid"
              action="secondary"
              size="md"
              className="h-11 w-11 rounded-xl bg-background-50 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={handleRefreshServers}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RotateCw size={18} className="text-primary-500" />
              </Animated.View>
            </Button>
          </HStack>
        }
      />

      <ScrollView className="flex-1">
        <VStack space="md" className="px-5 pb-6">
          {servers.map((server, index) => (
            <ServerCard key={server.id} id={server.id} index={index} />
          ))}
        </VStack>
      </ScrollView>

      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </View>
  );
}
