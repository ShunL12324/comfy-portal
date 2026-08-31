import { AppBar } from '@/components/layout/app-bar';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { SettingRow } from '@/components/self-ui/setting-row';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeStore } from '@/store/theme';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { BookOpen, ChevronRight, Cloud, FileText, GithubIcon, Info, Palette, Shield, Sparkles, Star } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';

export default function SettingScreen() {
  const { preference, setPreference } = useThemeStore();
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  // App Store URL
  const appStoreUrl = 'https://apps.apple.com/us/app/comfy-portal/id6741044736';

  const openAppStore = () => {
    Linking.openURL(appStoreUrl);
  };

  return (
    <View className="flex-1 bg-surface-base">
      <AppBar title="Setting" titleSize="xl" />
      <ScrollView className="flex-1">
        <View className="px-5 w-full">
          {/* Theme is a section rather than a row: the control is full-width
              below the label, not a trailing accessory. */}
          <View className="py-4">
            <View className="mb-4 flex-row items-center">
              <Icon as={Palette} size="lg" className="mr-3 text-action" />
              <Text className="text-base font-medium text-content-heading">Theme</Text>
            </View>
            <SegmentedControl options={['light', 'dark', 'system']} value={preference} onChange={(v) => setPreference(v as 'light' | 'dark' | 'system')} />
          </View>

          <SettingRow icon={Sparkles} label="AI Assistant" href="/settings/ai-assistant" />
          <SettingRow icon={Cloud} label="Cloud GPU" href="/settings/cloud-gpu" />
          <SettingRow icon={BookOpen} label="Server Setup Guide" href="/guide" />
          <SettingRow icon={Shield} label="Privacy Policy" href="/legal/privacy" />
          <SettingRow icon={FileText} label="Terms of Service" href="/legal/terms" />
          <SettingRow icon={Star} label="Enjoy this app? Rate us!" onPress={openAppStore} />

          {/* About expands in place, so it owns its own padding and the
              disclosure copy sits inside it. */}
          <View className="py-4">
            <Pressable
              className="flex-row items-center justify-between"
              onPress={() => setIsAboutExpanded(!isAboutExpanded)}
            >
              <View className="flex-row items-center">
                <Icon as={Info} size="lg" className="mr-3 text-action" />
                <Text className="text-base font-medium text-content-heading">About</Text>
              </View>
              <MotiView
                animate={{ rotateZ: isAboutExpanded ? '90deg' : '0deg' }}
                transition={{ type: 'timing', duration: 200 }}
              >
                <Icon as={ChevronRight} size="sm" className="text-content-tertiary" />
              </MotiView>
            </Pressable>

            {isAboutExpanded && (
              <MotiView
                from={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 200 }}
                className="mt-4"
              >
                <Text className="mb-4 text-sm text-content-body">
                  A mobile client for ComfyUI, designed to help you manage and run your ComfyUI workflows on the go,
                  focusing on providing a smooth and intuitive user experience.
                </Text>
                <Link href="https://github.com/ShunL12324/comfy-portal" asChild>
                  <Pressable className="mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Icon as={GithubIcon} size="lg" className="mr-3 text-action" />
                      <Text className="text-base font-medium text-content-heading">GitHub</Text>
                    </View>
                    <Icon as={ChevronRight} size="sm" className="text-content-tertiary" />
                  </Pressable>
                </Link>
                <Text className="text-sm text-content-secondary">
                  This is an open-source project. If you find this app helpful, please consider starring it on GitHub!
                </Text>
              </MotiView>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
