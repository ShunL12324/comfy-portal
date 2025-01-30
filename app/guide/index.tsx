import { AppBar } from '@/components/layout/app-bar';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SceneMap, TabView } from 'react-native-tab-view';
import { WebView } from 'react-native-webview';

const LocalServerGuide = () => (
  <WebView
    className="flex-1"
    source={{
      uri: 'https://shunl12324.github.io/comfy-portal/guide/local-server.html',
    }}
    cacheEnabled={false}
    cacheMode="LOAD_NO_CACHE"
    incognito={true}
  />
);

const RemoteServerGuide = () => (
  <WebView
    className="flex-1"
    source={{
      uri: 'https://shunl12324.github.io/comfy-portal/guide/remote-server.html',
    }}
    cacheEnabled={false}
    cacheMode="LOAD_NO_CACHE"
    incognito={true}
  />
);

const RunPodServerGuide = () => (
  <WebView
    className="flex-1"
    source={{
      uri: 'https://shunl12324.github.io/comfy-portal/guide/remote-server-runpod.html',
    }}
    cacheEnabled={false}
    cacheMode="LOAD_NO_CACHE"
    incognito={true}
  />
);

const renderScene = SceneMap({
  local: LocalServerGuide,
  remote: RemoteServerGuide,
  runpod: RunPodServerGuide,
});

export default function GuideScreen() {
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'local', title: 'Local Server' },
    { key: 'remote', title: 'Remote Server' },
    { key: 'runpod', title: 'RunPod Server' },
  ]);

  const renderTabBar = (props: any) => {
    return (
      <VStack className="bg-background-0">
        <AppBar title="ComfyUI Server Setup" showBack />
        <HStack className="border-b border-outline-200 px-5">
          {props.navigationState.routes.map((route: any, i: number) => {
            const isActive = index === i;
            return (
              <Pressable
                key={route.key}
                onPress={() => setIndex(i)}
                className="flex-1"
              >
                <VStack className="items-center pb-3">
                  <Text
                    className={`text-sm font-medium ${
                      isActive ? 'text-primary-900' : 'text-typography-500'
                    }`}
                  >
                    {route.title}
                  </Text>
                </VStack>
                {isActive && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-900" />
                )}
              </Pressable>
            );
          })}
        </HStack>
      </VStack>
    );
  };

  return (
    <View className="flex-1 bg-background-0">
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />
    </View>
  );
}
