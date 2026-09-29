import { WebViewPage } from '@/components/common/webview-page';
import { AppBar } from '@/components/layout/app-bar';
import { Segments } from '@/components/ui/design-system/primitives';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SceneMap, TabView } from 'react-native-tab-view';

const LocalServerGuide = () => (
  <WebViewPage
    uri="https://shunl12324.github.io/comfy-portal/guide/local-server"
    loadingTitle="Loading Local Server Guide..."
    slowLoadingTitle="Local Server Guide is taking longer than expected"
  />
);

const RemoteServerGuide = () => (
  <WebViewPage
    uri="https://shunl12324.github.io/comfy-portal/guide/remote-server"
    loadingTitle="Loading Remote Server Guide..."
    slowLoadingTitle="Remote Server Guide is taking longer than expected"
  />
);

const RunPodServerGuide = () => (
  <WebViewPage
    uri="https://shunl12324.github.io/comfy-portal/guide/remote-server-runpod"
    loadingTitle="Loading RunPod Server Guide..."
    slowLoadingTitle="RunPod Server Guide is taking longer than expected"
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

  const renderTabBar = () => (
    <AppBar
      title="Connection guide"
      showBack
      bottomElement={
        <Segments
          options={['Local', 'Remote', 'RunPod']}
          value={['Local', 'Remote', 'RunPod'][index]}
          onChange={(value) => setIndex(['Local', 'Remote', 'RunPod'].indexOf(value))}
        />
      }
    />
  );

  return (
    <View className="bg-surface-base flex-1">
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
