import React, { useState, useEffect, useRef } from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { ServerCard } from '@/components/server-card';
import { MotiView } from 'moti';
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

const MINIMUM_REFRESH_TIME = 1000; // 1秒，确保至少旋转一圈

export default function HomeScreen() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { servers, loading, refreshServers } = useServersStore();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const startRotation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  };

  const stopRotation = () => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    startRotation();
    const startTime = Date.now();

    try {
      await refreshServers();
    } catch (error) {
      // Silently handle error
    }

    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < MINIMUM_REFRESH_TIME) {
      await new Promise((resolve) =>
        setTimeout(resolve, MINIMUM_REFRESH_TIME - elapsedTime),
      );
    }

    stopRotation();
    setIsRefreshing(false);
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar
        title="Servers"
        bottomElement={
          <HStack space="sm" className="items-center">
            <Button
              variant="solid"
              action="primary"
              size="md"
              className="h-11 flex-1 rounded-xl bg-background-50/80 backdrop-blur-sm active:bg-background-100/80"
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
              className="h-11 w-11 rounded-xl bg-background-50/80 p-0 backdrop-blur-sm active:bg-background-100/80"
              onPress={handleRefresh}
              disabled={isRefreshing}
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
            <MotiView
              key={server.id}
              from={{
                opacity: 0,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                type: 'timing',
                delay: index * 50,
                duration: 150,
              }}
            >
              <ServerCard
                name={server.name}
                host={server.host}
                port={server.port}
                status={server.status}
                latency={server.latency || 0}
                id={server.id}
              />
            </MotiView>
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
