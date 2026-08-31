import { AppBar } from '@/components/layout/app-bar';
import { EmptyState } from '@/components/self-ui/empty-state';
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
import { LaunchCard } from '@/features/cloud/components/launch-card';
import { useProvisioningStore } from '@/features/cloud/stores/provisioning-store';
import { CLOUD_GPU_SUPPORTED } from '@/features/cloud/utils/availability';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, Cloud, Plus, RefreshCcw, ScanSearch } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useMemo, useRef, useState } from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const addServerModalRef = useRef<AddServerModalRef>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { servers, refreshServer } = useServersStore();
  // Select the stable `launches` array itself, then derive with useMemo --
  // filtering inside the Zustand selector returns a new array every read,
  // which useSyncExternalStore treats as a changed snapshot on every render
  // and loops ("Maximum update depth exceeded").
  //
  // Not `.active()` — a failed launch should stay visible (with its error)
  // until the user destroys or dismisses it, not vanish the moment it fails.
  const launches = useProvisioningStore((s) => s.launches);
  const pendingLaunches = useMemo(() => launches.filter((l) => l.stage !== 'ready'), [launches]);

  const handleRefreshServers = async () => {
    setIsRefreshing(true);
    await Promise.all(servers.map((s) => refreshServer(s.id)));
    setIsRefreshing(false);
  };

  return (
    <View className={`flex-1 bg-surface-base`}>
      <AppBar
        title="Servers"
        titleSize="xl"
        bottomElement={
          <HStack space="sm" className="items-center">
            <Button
              variant="solid"
              action="primary"
              size="md"
              className="h-11 flex-1 rounded-xl bg-surface-raised data-[focus=true]:bg-surface-base data-[active=true]:bg-surface-base"
              onPress={() => addServerModalRef.current?.present()}
            >
              <HStack space="sm" className="items-center justify-center">
                <Icon as={Plus} size="md" className="text-action" />
                <Text className="text-sm font-medium text-content-heading">Add Server</Text>
              </HStack>
            </Button>
            {CLOUD_GPU_SUPPORTED && (
              <Button
                variant="solid"
                action="secondary"
                size="md"
                className="h-11 w-11 rounded-xl bg-surface-raised data-[focus=true]:bg-surface-base data-[active=true]:bg-surface-base"
                onPress={() => router.push('/cloud/launch')}
              >
                <Icon as={Cloud} size="md" className="text-action" />
              </Button>
            )}
            <Button
              variant="solid"
              action="secondary"
              size="md"
              className="h-11 w-11 rounded-xl bg-surface-raised data-[focus=true]:bg-surface-base data-[active=true]:bg-surface-base"
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
                <Icon as={RefreshCcw} size="sm" className="text-action" />
              </MotiView>
            </Button>
          </HStack>
        }
      />

      <ScrollView className="flex-1">
        <VStack space="md" className="px-5 pb-6 w-full">
          {servers.length > 0 || pendingLaunches.length > 0 ? (
            <>
              {pendingLaunches.map((launch, index) => (
                <LaunchCard key={launch.instanceId} launch={launch} index={index} />
              ))}
              {/* One hairline container around every row, so the boundary
                  between two servers is a single line and the latencies form
                  one column down the right edge. */}
              {servers.length > 0 ? (
                <View className="overflow-hidden rounded-[10px] border border-ink/10">
                  {servers.map((server, index) => (
                    <ServerCard
                      key={server.id}
                      id={server.id}
                      index={pendingLaunches.length + index}
                      isFirst={index === 0}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Nothing here yet."
              action={
                <HStack space="xs" className="items-center">
                  <Text className="text-sm text-content-tertiary">New to ComfyUI?</Text>
                  <Link href="/guide" asChild>
                    <Button variant="link" size="sm" className="h-7 px-0 data-[hover=true]:opacity-70">
                      <HStack space="xs" className="items-center">
                        <Text className="text-sm font-medium text-action">Setup Instructions</Text>
                        <Icon as={ArrowRight} size="xs" className="text-action" />
                      </HStack>
                    </Button>
                  </Link>
                </HStack>
              }
            >
              Add a server to connect to your ComfyUI instance.
            </EmptyState>
          )}
        </VStack>
      </ScrollView>

      <AddServerModal ref={addServerModalRef} />
    </View>
  );
}
