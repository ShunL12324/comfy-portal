import React from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import {
  Github,
  Terminal,
  Globe,
  Server,
  AlertTriangle,
} from 'lucide-react-native';
import { Link } from '@/components/ui/link';
import { Divider } from '@/components/ui/divider';

export default function LocalServerGuide() {
  return (
    <ScrollView className="flex-1">
      <View className="p-5 pb-8">
        <Card className="border-0.5 mb-5 border-warning-200 bg-background-warning p-3">
          <View className="flex-row items-start gap-2">
            <Icon
              as={AlertTriangle}
              size="sm"
              className="mt-0.5 text-warning-500"
            />
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-medium text-warning-700">
                Disclaimer
              </Text>
              <Text className="text-sm leading-5 text-warning-600">
                This guide provides setup instructions only. Please understand
                all potential risks before proceeding. We are not responsible
                for any damages or losses that may occur.
              </Text>
            </View>
          </View>
        </Card>

        <Text className="mb-4 text-base leading-6 text-typography-600">
          Follow these steps to set up your own ComfyUI server locally and
          connect it to this app.
        </Text>

        <Card className="border-0.5 mb-4 border-outline-200 p-3">
          <Text className="mb-3 text-base leading-6 text-typography-600">
            Please follow the official ComfyUI installation guide to set up the
            required environment and dependencies:
          </Text>
          <Link
            href="https://github.com/comfyanonymous/ComfyUI#installing"
            className="text-accent-500"
          >
            <Text className="text-base font-medium">
              ComfyUI Installation Guide →
            </Text>
          </Link>
        </Card>

        <View className="space-y-4">
          {/* Step 1 */}
          <Card className="border-0.5 border-outline-200 p-3">
            <View className="mb-3 flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-50">
                <Icon as={Globe} size="lg" className="text-accent-500" />
              </View>
              <Heading size="sm" className="ml-3 text-typography-900">
                1. Network Setup
              </Heading>
            </View>
            <Divider className="mb-3" />
            <Text className="mb-3 text-base leading-6 text-typography-600">
              Ensure your phone and the computer running ComfyUI are on the same
              local network (connected to the same WiFi/router).
            </Text>
            <Text className="mb-3 text-base leading-6 text-typography-600">
              To find your computer's IP address:
            </Text>
            <View className="mb-4 space-y-2">
              <Text className="text-base text-typography-600">
                • Windows: Open Command Prompt and type "ipconfig"
              </Text>
              <Text className="text-base text-typography-600">
                • macOS: Open Terminal and type "ifconfig" or go to System
                Settings → Network
              </Text>
              <Text className="text-base text-typography-600">
                • Linux: Open Terminal and type "ip addr" or "ifconfig"
              </Text>
            </View>
            <Card className="bg-background-50 p-3">
              <Text className="text-base text-typography-600">
                Look for IPv4 address, usually starting with 192.168.x.x or
                10.0.x.x
              </Text>
            </Card>
          </Card>

          {/* Step 2 */}
          <Card className="border-0.5 border-outline-200 p-3">
            <View className="mb-3 flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-50">
                <Icon as={Server} size="lg" className="text-accent-500" />
              </View>
              <Heading size="sm" className="ml-3 text-typography-900">
                2. Start the Server
              </Heading>
            </View>
            <Divider className="mb-3" />
            <Text className="mb-3 text-base leading-6 text-typography-600">
              After installation, start the ComfyUI server with network access
              enabled:
            </Text>
            <Card className="mb-4 bg-background-100 p-3">
              <Text className="font-mono text-sm text-typography-900">
                python main.py --listen 0.0.0.0 --port 8188
              </Text>
            </Card>
            <Text className="text-base leading-6 text-typography-600">
              This will start the server on port 8188 and make it accessible
              from other devices on your network.
            </Text>
          </Card>

          {/* Step 3 */}
          <Card className="border-0.5 border-outline-200 p-3">
            <View className="mb-3 flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-50">
                <Icon as={Globe} size="lg" className="text-accent-500" />
              </View>
              <Heading size="sm" className="ml-3 text-typography-900">
                3. Connect to the Server
              </Heading>
            </View>
            <Divider className="mb-3" />
            <Text className="mb-3 text-base leading-6 text-typography-600">
              Once the server is running, tap the "+" button to add a new server
              with the following details:
            </Text>
            <View className="mb-4 space-y-2">
              <Text className="text-base text-typography-600">
                • Name: Give your server a memorable name (e.g., "Home Server")
              </Text>
              <Text className="text-base text-typography-600">
                • Host: Your computer's IP address or "localhost" (do not
                include http:// prefix)
              </Text>
              <Text className="text-base text-typography-600">
                • Port: 8188 (default ComfyUI port)
              </Text>
            </View>
            <Text className="mb-2 text-base font-medium text-typography-600">
              Example for local network:
            </Text>
            <Card className="bg-background-50 p-3">
              <View className="space-y-2">
                <Text className="text-base text-typography-600">
                  Name: Home ComfyUI
                </Text>
                <Text className="text-base text-typography-600">
                  Host: 192.168.1.100
                </Text>
                <Text className="text-base text-typography-600">
                  Port: 8188
                </Text>
              </View>
            </Card>
          </Card>
        </View>

        <View className="mt-4">
          <Text className="mb-2 text-base text-typography-600">
            For troubleshooting and additional setup options, visit:
          </Text>
          <Link
            href="https://github.com/comfyanonymous/ComfyUI"
            className="text-accent-500"
          >
            <Text className="text-base font-medium">
              ComfyUI GitHub Repository →
            </Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
