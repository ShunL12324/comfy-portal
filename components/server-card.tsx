import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { MotiView } from 'moti';
import { Activity, Server, Edit2, Globe, Hash } from 'lucide-react-native';
import { EditServerModal } from './edit-server-modal';
import { router } from 'expo-router';

interface ServerCardProps {
  name: string;
  domain: string;
  port: number;
  status: 'online' | 'offline';
  latency: number;
  id: string;
  onPress?: () => void;
}

export const ServerCard = ({
  name,
  domain,
  port,
  status,
  latency,
  id,
}: ServerCardProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  const handlePress = () => {
    router.push(`/workflow/${id}`);
  };

  return (
    <>
      <MotiView
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 150 }}
      >
        <Pressable
          onPress={handlePress}
          className="overflow-hidden rounded-2xl bg-background-50/80 backdrop-blur-sm active:opacity-90"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
          }}
        >
          <HStack className="items-center justify-between p-4">
            <HStack space="md" className="flex-1 items-center">
              <HStack className="h-16 w-16 items-center justify-center rounded-2xl bg-background-0/80 backdrop-blur-sm">
                <Server size={28} className="text-primary-500" />
              </HStack>
              <VStack space="xs" className="flex-1">
                <Text
                  className="text-base font-semibold text-primary-500"
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <VStack space="xs">
                  <HStack space="xs" className="items-center">
                    <Globe size={14} className="text-primary-300" />
                    <Text
                      className="text-sm text-primary-400"
                      numberOfLines={1}
                    >
                      {domain}
                    </Text>
                  </HStack>
                  <HStack space="xs" className="items-center">
                    <Hash size={14} className="text-primary-300" />
                    <Text
                      className="text-sm text-primary-400"
                      numberOfLines={1}
                    >
                      {port}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </HStack>
            <VStack space="md" className="h-16 items-end justify-center">
              <Pressable
                onPress={() => setIsEditModalOpen(true)}
                className="h-8 w-8 items-center justify-center rounded-lg bg-background-0/80 backdrop-blur-sm active:bg-background-100/80"
              >
                <Edit2 size={13} className="text-primary-400" />
              </Pressable>
              <HStack
                space="xs"
                className={`items-center rounded-lg px-2 py-1 ${
                  status === 'online'
                    ? 'bg-success-50/30 backdrop-blur-sm'
                    : 'bg-error-50/30 backdrop-blur-sm'
                }`}
              >
                <MotiView
                  animate={{
                    scale: status === 'online' ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    loop: status === 'online',
                    type: 'timing',
                    duration: 2000,
                    delay: 500,
                  }}
                >
                  <Activity
                    size={11}
                    className={
                      status === 'online'
                        ? 'text-success-600'
                        : 'text-error-600'
                    }
                  />
                </MotiView>
                <Text
                  className={`text-xs font-medium ${
                    status === 'online' ? 'text-success-700' : 'text-error-700'
                  }`}
                >
                  {status === 'online' ? `${latency}ms` : 'Offline'}
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </Pressable>
      </MotiView>

      <EditServerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        server={{ id, name, domain, port, status, latency }}
      />
    </>
  );
};
