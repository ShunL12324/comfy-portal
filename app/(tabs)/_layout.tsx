import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar, TabRoute } from '../../components/layout/tab-bar';

export default function TabLayout() {
  // Helper function to determine active tab name based on index
  const getActiveTabNameByIndex = (index: number): TabRoute => {
    switch (index) {
      case 0:
        return 'server';
      case 1:
        return 'explore';
      case 2:
        return 'setting';
      default:
        return 'server'; // Default to first tab
    }
  };

  // Helper function to determine active tab name based on route name
  // This aligns better with how Expo Router handles names
  const getActiveTabNameByRoute = (routeName: string): TabRoute => {
    if (routeName === 'index') return 'server';
    if (routeName === 'explore') return 'explore';
    if (routeName === 'setting') return 'setting';
    return 'server'; // Default
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => {
        // Get the current route name from the state
        const currentRouteName = props.state.routes[props.state.index]?.name;
        const activeTab = getActiveTabNameByRoute(currentRouteName);

        return (
          <TabBar
            activeTab={activeTab}
            onChangeTab={(tab: TabRoute) => {
              // Map TabRoute back to screen name for navigation
              const screenName = tab === 'server' ? 'index' : tab;
              props.navigation.navigate(screenName);
            }}
          />
        );
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Servers',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
