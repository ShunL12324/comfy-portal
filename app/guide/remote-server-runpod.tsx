import React from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { AlertTriangle, Server, Globe } from 'lucide-react-native';
import { Link } from '@/components/ui/link';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Divider } from '@/components/ui/divider';

export default function RemoteServerRunpodGuide() {
  return (
    <ScrollView className="flex-1">
      <View className="p-5 pb-8">
        <Card className="border-0.5 mb-5 border-warning-200 bg-background-warning">
          <View className="flex-row items-start gap-2 p-3">
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
                RunPod is a third-party service. We have no affiliation with
                RunPod and are not responsible for their service, pricing, or
                any potential damages or losses that may occur.
              </Text>
            </View>
          </View>
        </Card>

        <View className="space-y-4">
          {/* Step 1 */}
          <Card className="border-0.5 border-outline-200">
            <View className="p-3">
              <View className="mb-3 flex-row items-center">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-50">
                  <Icon as={Server} size="lg" className="text-accent-500" />
                </View>
                <Heading size="sm" className="ml-3 text-typography-900">
                  1. Configure RunPod Template
                </Heading>
              </View>
              <Divider className="mb-3" />
              <Text className="mb-3 text-base leading-6 text-typography-600">
                When deploying your pod, make these important configurations:
              </Text>
              <View className="mb-3 ml-1 space-y-2">
                <Text className="text-base text-typography-600">
                  • Click "Edit Template" during deployment
                </Text>
                <Text className="text-base text-typography-600">
                  • Find "Expose HTTP Ports" section
                </Text>
                <Text className="text-base text-typography-600">
                  • Add port 8188 (ComfyUI's default port)
                </Text>
              </View>
              <Text className="mb-2 text-base text-typography-600">
                For detailed port configuration instructions, see:
              </Text>
              <Link
                href="https://docs.runpod.io/pods/configuration/expose-ports"
                className="text-accent-500"
              >
                <Text className="text-base font-medium">
                  RunPod Port Configuration Guide →
                </Text>
              </Link>
            </View>
          </Card>

          {/* Step 2 */}
          <Card className="border-0.5 border-outline-200">
            <View className="p-3">
              <View className="mb-3 flex-row items-center">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-50">
                  <Icon as={Server} size="lg" className="text-accent-500" />
                </View>
                <Heading size="sm" className="ml-3 text-typography-900">
                  2. Start ComfyUI
                </Heading>
              </View>
              <Divider className="mb-3" />
              <Text className="mb-3 text-base leading-6 text-typography-600">
                After your pod is running, start ComfyUI with network access
                enabled:
              </Text>
              <Card className="mb-4 bg-background-100 p-3">
                <Text className="font-mono text-sm text-typography-900">
                  python main.py --listen 0.0.0.0 --port 8188
                </Text>
              </Card>
              <Text className="mb-3 text-base leading-6 text-typography-600">
                You can verify the HTTP service status and get your connection
                URL:
              </Text>
              <View className="mb-4 ml-1 space-y-2">
                <Text className="text-base text-typography-600">
                  • Go to your pod's management page
                </Text>
                <Text className="text-base text-typography-600">
                  • Click "Connect" button
                </Text>
                <Text className="text-base text-typography-600">
                  • Under "HTTP Services", you should see port :8188 marked as
                  "Ready"
                </Text>
              </View>
              <Image
                source={require('@/assets/images/guide/runpod-url.png')}
                alt="RunPod HTTP Services interface showing the connection URL"
                className="h-[250] w-full rounded-xl"
                resizeMode="contain"
              />
            </View>
          </Card>

          {/* Step 3 */}
          <Card className="border-0.5 border-outline-200">
            <View className="p-3">
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
                Once ComfyUI is running, tap the "+" button to add the server:
              </Text>
              <View className="mb-4 ml-1 space-y-2">
                <Text className="text-base text-typography-600">
                  • Name: Give your pod a memorable name (e.g., "RunPod Server")
                </Text>
                <Text className="text-base text-typography-600">
                  • Host: Your pod's proxy URL (do not include https:// prefix)
                </Text>
                <Text className="text-base text-typography-600">
                  • Port: 443 (RunPod proxy uses HTTPS port)
                </Text>
              </View>
              <Card className="border-0.5 mb-4 border-info-200 bg-info-50">
                <View className="flex-row items-start gap-2 p-3">
                  <Icon
                    as={AlertTriangle}
                    size="sm"
                    className="mt-0.5 text-info-500"
                  />
                  <Text className="flex-1 text-base leading-6 text-info-700">
                    Although ComfyUI runs on port 8188, we use port 443 because
                    RunPod proxies the connection through HTTPS.
                  </Text>
                </View>
              </Card>
              <Text className="mb-2 text-base font-medium text-typography-600">
                Example:
              </Text>
              <Card className="bg-background-50 p-3">
                <View className="space-y-2">
                  <Text className="text-base text-typography-600">
                    Name: RunPod ComfyUI
                  </Text>
                  <Text className="text-base text-typography-600">
                    Host: ****abc-8188.proxy.runpod.net
                  </Text>
                  <Text className="text-base text-typography-600">
                    Port: 443
                  </Text>
                </View>
              </Card>
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}
