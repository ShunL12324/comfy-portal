import { AppBar } from '@/components/layout/app-bar';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Icon } from '@/components/ui/icon';
import {
  ChevronRight,
  BookOpen,
  Info,
  GithubIcon,
  Palette,
} from 'lucide-react-native';
import { Link } from 'expo-router';
import { useThemeStore } from '@/store/theme';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { ScrollView } from '@/components/ui/scroll-view';
import { useState } from 'react';
import { MotiView } from 'moti';

export default function SettingScreen() {
  const { theme, isSystemTheme, setTheme, useSystemTheme } = useThemeStore();
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  const handleThemeChange = (value: string) => {
    if (value === 'system') {
      useSystemTheme();
    } else {
      setTheme(value as 'light' | 'dark');
    }
  };

  const currentTheme = isSystemTheme ? 'system' : theme || 'light';

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="Setting" />
      <ScrollView className="flex-1">
        <View className="px-5 pb-6">
          {/* Theme */}
          <View className="mb-4">
            <View className="mb-4 flex-row items-center">
              <Icon as={Palette} size="lg" className="mr-3 text-accent-500" />
              <Text className="text-base font-medium text-typography-900">
                Theme
              </Text>
            </View>
            <SegmentedControl
              options={['light', 'dark', 'system']}
              value={currentTheme}
              onChange={handleThemeChange}
            />
          </View>

          <View className="h-[1px] bg-outline-200" />

          {/* Guide */}
          <Link href="/guide" asChild>
            <Pressable className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center">
                <Icon
                  as={BookOpen}
                  size="lg"
                  className="mr-3 text-accent-500"
                />
                <Text className="text-base font-medium text-typography-900">
                  Server Setup Guide
                </Text>
              </View>
              <Icon
                as={ChevronRight}
                size="sm"
                className="text-typography-400"
              />
            </Pressable>
          </Link>

          <View className="h-[1px] bg-outline-200" />

          {/* About */}
          <View className="pt-4">
            <Pressable
              className="flex-row items-center justify-between"
              onPress={() => setIsAboutExpanded(!isAboutExpanded)}
            >
              <View className="flex-row items-center">
                <Icon as={Info} size="lg" className="mr-3 text-accent-500" />
                <Text className="text-base font-medium text-typography-900">
                  About
                </Text>
              </View>
              <MotiView
                animate={{
                  rotateZ: isAboutExpanded ? '90deg' : '0deg',
                }}
              >
                <Icon
                  as={ChevronRight}
                  size="sm"
                  className="text-typography-400"
                />
              </MotiView>
            </Pressable>

            {isAboutExpanded && (
              <MotiView
                from={{
                  opacity: 0,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  type: 'timing',
                  duration: 200,
                }}
              >
                <Text className="mb-4 mt-4 text-sm leading-5 text-typography-600">
                  A mobile client for ComfyUI, designed to help you manage and
                  run your ComfyUI workflows on the go. Built with modern
                  technologies and focused on providing the best user
                  experience.
                </Text>
                <Link href="https://github.com/ShunL12324/comfy-portal" asChild>
                  <Pressable className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Icon
                        as={GithubIcon}
                        size="lg"
                        className="mr-3 text-accent-500"
                      />
                      <Text className="text-base font-medium text-typography-900">
                        GitHub
                      </Text>
                    </View>
                    <Icon
                      as={ChevronRight}
                      size="sm"
                      className="text-typography-400"
                    />
                  </Pressable>
                </Link>
              </MotiView>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
