import React, { useState } from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { ServerCard } from '@/components/self-ui/server-card';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button } from '@/components/ui/button';
import { Plus, RotateCw } from 'lucide-react-native';
import { HStack } from '@/components/ui/hstack';
import { useServersStore } from '@/store/servers';
import { View } from '@/components/ui/view';
import { MotiView } from 'moti';
import { AddServerModal } from '@/components/self-ui/add-server-modal';
import { AppBar } from '@/components/layout/app-bar';
import { useThemeStore } from '@/store/theme';
import { Icon } from '@/components/ui/icon';

export default function HomeScreen() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { servers, refreshServer } = useServersStore();

  const handleRefreshServers = async () => {
    setIsRefreshing(true);
    await Promise.all(servers.map((s) => refreshServer(s.id)));
    setIsRefreshing(false);
  };

  return (
    <View className={`flex-1 bg-background-0`}>
      <AppBar
        title="Servers"
        bottomElement={
          <HStack space="sm" className="items-center">
            <Button
              variant="solid"
              action="primary"
              size="md"
              className="h-11 flex-1 rounded-xl bg-background-200 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={() => setIsAddModalOpen(true)}
            >
              <HStack space="sm" className="items-center justify-center">
                <Icon as={Plus} size="md" className="text-accent-500" />
                <Text className="text-sm font-medium text-typography-900">
                  Add Server
                </Text>
              </HStack>
            </Button>
            <Button
              variant="solid"
              action="secondary"
              size="md"
              className="h-11 w-11 rounded-xl bg-background-200 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={handleRefreshServers}
            >
              <MotiView
                animate={{
                  rotate: isRefreshing ? '-360deg' : '0deg',
                }}
                transition={{
                  loop: isRefreshing,
                  duration: 1000,
                  type: 'timing',
                }}
              >
                <Icon as={RotateCw} size="sm" className="text-accent-500" />
              </MotiView>
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
