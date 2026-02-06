import { AppBar } from '@/components/layout/app-bar';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Link } from 'expo-router';
import { ChevronRight, Edit3, Server } from 'lucide-react-native';

export default function AIAssistantScreen() {
  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="AI Assistant" showBack />
      <View className="px-5 pt-4">
        {/* API Provider */}
        <Link href="/settings/ai-assistant/provider" asChild>
          <Pressable className="py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon as={Server} size="lg" className="mr-3 text-primary-500" />
                <Text className="text-base font-medium text-typography-900">API Provider</Text>
              </View>
              <Icon as={ChevronRight} size="sm" className="text-typography-400" />
            </View>
          </Pressable>
        </Link>

        {/* Prompt Templates */}
        <Link href="/settings/ai-assistant/templates" asChild>
          <Pressable className="py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon as={Edit3} size="lg" className="mr-3 text-primary-500" />
                <Text className="text-base font-medium text-typography-900">Prompt Templates</Text>
              </View>
              <Icon as={ChevronRight} size="sm" className="text-typography-400" />
            </View>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
