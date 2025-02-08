import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Route, TabBar, TabBarItem, TabView } from 'react-native-tab-view';
import TabGeneration from './tabs/tab-generation';
import TabModel from './tabs/tab-model';
import TabPrompt from './tabs/tab-prompt';
import TabSampler from './tabs/tab-sampler';
interface ControlPanelProps {
  serverId: string;
  presetId: string;
}

export default function ControlPanel({ serverId, presetId }: ControlPanelProps) {
  const { height: screenHeight } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [routes, setRoutes] = useState<Route[]>([
    {
      key: 'model',
      title: 'Model',
    },
    {
      key: 'prompt',
      title: 'Prompt',
    },
    {
      key: 'sampler',
      title: 'Sampler',
    },
    {
      key: 'generation',
      title: 'Generation',
    },
  ]);

  const renderScene = ({ route }: { route: Route }) => {
    switch (route.key) {
      case 'model':
        return <TabModel serverId={serverId} presetId={presetId} />;
      case 'prompt':
        return <TabPrompt serverId={serverId} presetId={presetId} />;
      case 'sampler':
        return <TabSampler serverId={serverId} presetId={presetId} />;
      case 'generation':
        return <TabGeneration serverId={serverId} presetId={presetId} />;
    }
  };

  const theme = useThemeStore((state) => state.theme);
  return (
    <TabView
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      tabBarPosition="top"
      lazy={false}
      swipeEnabled={false}
      style={{
        flex: 1,
        borderTopWidth: 1,
        borderTopColor: theme === 'dark' ? Colors.dark.outline['50'] : Colors.light.outline['50'],
      }}
      renderTabBar={(props) => (
        <TabBar
          {...props}
          scrollEnabled={false}
          style={{
            backgroundColor: theme === 'dark' ? Colors.dark.background['0'] : Colors.light.background['0'],
          }}
          activeColor={theme === 'dark' ? Colors.dark.typography['950'] : Colors.light.typography['950']}
          inactiveColor={theme === 'dark' ? Colors.dark.typography['400'] : Colors.light.typography['400']}
          indicatorStyle={{
            backgroundColor: theme === 'dark' ? Colors.dark.typography['950'] : Colors.light.typography['950'],
          }}
          renderTabBarItem={(itemProps) => {
            const { key, ...otherProps } = itemProps;
            return (
              <TabBarItem
                key={key}
                {...otherProps}
                labelStyle={{
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
              />
            );
          }}
        />
      )}
      pagerStyle={{
        flex: 1,
        backgroundColor: theme === 'dark' ? Colors.dark.background['0'] : Colors.light.background['0'],
        height: screenHeight,
      }}
    />
  );
}
