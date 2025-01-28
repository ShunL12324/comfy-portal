import React from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Globe, Server, AlertTriangle, Lock } from 'lucide-react-native';
import { Link } from '@/components/ui/link';
import { Divider } from '@/components/ui/divider';

export default function RemoteServerGuide() {
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
          Follow these steps to connect to your remote ComfyUI server. The setup
          is similar to local server, but requires additional security measures.
        </Text>

        <Card className="border-0.5 mb-4 border-outline-200 p-3">
          <Text className="mb-3 text-base leading-6 text-typography-600">
            Please follow the official ComfyUI installation guide to set up the
            required environment and dependencies on your remote server:
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
                1. Network Requirements
              </Heading>
            </View>
            <Divider className="mb-3" />
            <Text className="mb-3 text-base leading-6 text-typography-600">
              Ensure your remote server meets these requirements:
            </Text>
            <View className="mb-4 space-y-2">
              <Text className="text-base text-typography-600">
                • A public IP address or domain name
              </Text>
              <Text className="text-base text-typography-600">
                • Port 8188 (or your chosen port) is open and accessible
              </Text>
              <Text className="text-base text-typography-600">
                • Firewall configured to allow incoming connections
              </Text>
            </View>
          </Card>

          {/* Step 2 */}
          <Card className="border-0.5 border-outline-200 p-3">
            <View className="mb-3 flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-50">
                <Icon as={Lock} size="lg" className="text-accent-500" />
              </View>
              <Heading size="sm" className="ml-3 text-typography-900">
                2. HTTPS Setup (Required)
              </Heading>
            </View>
            <Divider className="mb-3" />
            <Text className="mb-3 text-base leading-6 text-typography-600">
              Due to Apple's security restrictions, HTTPS is required for remote
              connections. You have two options:
            </Text>
            <View className="mb-4 space-y-2">
              <Text className="text-base text-typography-600">
                • Follow ComfyUI's built-in SSL/TLS setup guide:
              </Text>
              <Link
                href="https://github.com/comfyanonymous/ComfyUI?tab=readme-ov-file#how-to-use-tlsssl"
                className="text-accent-500"
              >
                <Text className="text-base font-medium">
                  ComfyUI TLS/SSL Setup Guide →
                </Text>
              </Link>
              <Text className="mt-2 text-base text-typography-600">
                • Alternatively, you can use Nginx or similar web servers as a
                reverse proxy to handle HTTPS
              </Text>
            </View>
          </Card>

          {/* Step 3 */}
          <Card className="border-0.5 border-outline-200 p-3">
            <View className="mb-3 flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-50">
                <Icon as={Server} size="lg" className="text-accent-500" />
              </View>
              <Heading size="sm" className="ml-3 text-typography-900">
                3. Connect to the Server
              </Heading>
            </View>
            <Divider className="mb-3" />
            <Text className="mb-3 text-base leading-6 text-typography-600">
              Once the server is running with HTTPS, tap the "+" button to add
              it with these details:
            </Text>
            <View className="mb-4 space-y-2">
              <Text className="text-base text-typography-600">
                • Name: Give your server a memorable name (e.g., "Cloud Server")
              </Text>
              <Text className="text-base text-typography-600">
                • Host: Your server's public IP or domain name (do not include
                https:// prefix)
              </Text>
              <Text className="text-base text-typography-600">
                • Port: 8188 (or your configured port)
              </Text>
            </View>
            <Text className="mb-2 text-base font-medium text-typography-600">
              Example:
            </Text>
            <Card className="bg-background-50 p-3">
              <View className="space-y-2">
                <Text className="text-base text-typography-600">
                  Name: Cloud ComfyUI
                </Text>
                <Text className="text-base text-typography-600">
                  Host: comfyui.example.com
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
