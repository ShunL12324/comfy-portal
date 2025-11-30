import { AppBar } from '@/components/layout/app-bar';
import { Button } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { AddServerModal, type AddServerModalRef } from '@/features/server/components/add-server-modal';
import { ServerCard } from '@/features/server/components/server-card';
import { useServersStore } from '@/features/server/stores/server-store';
import { Link } from 'expo-router';
import { ArrowRight, Plus, RefreshCcw, ScanSearch } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useRef, useState } from 'react';

export default function HomeScreen() {
  const addServerModalRef = useRef<AddServerModalRef>(null);
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
        titleSize="xl"
        bottomElement={
          <HStack space="sm" className="items-center">
            <Button
              variant="solid"
              action="primary"
              size="md"
              className="h-11 flex-1 rounded-xl bg-background-50 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={() => addServerModalRef.current?.present()}
            >
              <HStack space="sm" className="items-center justify-center">
                <Icon as={Plus} size="md" className="text-primary-500" />
                <Text className="text-sm font-medium text-typography-900">Add Server</Text>
              </HStack>
            </Button>
            <Button
              variant="solid"
              action="secondary"
              size="md"
              className="h-11 w-11 rounded-xl bg-background-50 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={handleRefreshServers}
            >
              <MotiView
                animate={{
                  rotate: isRefreshing ? '360deg' : '0deg',
                }}
                transition={{
                  loop: isRefreshing,
                  type: 'timing',
                  duration: 1000,
                  delay: 0,
                  repeatReverse: false,
                }}
              >
                <Icon as={RefreshCcw} size="sm" className="text-primary-500" />
              </MotiView>
            </Button>
          </HStack>
        }
      />

      <ScrollView className="flex-1">
        <VStack space="md" className="px-5 pb-6">
          {servers.length > 0 ? (
            servers.map((server, index) => <ServerCard key={server.id} id={server.id} index={index} />)
          ) : (
            <Center className="mt-10">
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 300 }}
              >
                <VStack space="lg" className="items-center px-6">
                  <VStack space="lg" className="items-center">
                    <MotiView
                      from={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: 'timing',
                        duration: 500,
                        delay: 100,
                      }}
                    >
                      <Icon as={ScanSearch} size="xl" className="mb-2 h-16 w-16 text-typography-200" />
                    </MotiView>
                    <VStack space="xs" className="items-center">
                      <Text className="text-center text-sm text-typography-500">
                        Click the <Text className="text-primary-500">+ Add Server</Text> button above to connect to your
                        ComfyUI instance
                      </Text>
                    </VStack>
                  </VStack>

                  <VStack space="md" className="items-center">
                    <HStack space="xs" className="items-center justify-center">
                      <Text className="text-sm text-typography-500">New to ComfyUI?</Text>
                      <Link href="/guide" asChild>
                        <Button
                          variant="outline"
                          action="secondary"
                          size="md"
                          className="rounded-xl border-0 px-0 data-[hover=true]:opacity-70"
                        >
                          <HStack space="xs" className="items-center justify-center">
                            <Text className="text-sm font-medium text-primary-500">Setup Instructions</Text>
                            <Icon as={ArrowRight} size="xs" className="text-primary-500" />
                          </HStack>
                        </Button>
                      </Link>
                    </HStack>
                  </VStack>
                </VStack>
              </MotiView>
            </Center>
          )}
        </VStack>
      </ScrollView>

      <AddServerModal ref={addServerModalRef} />
    </View>
  );
}
