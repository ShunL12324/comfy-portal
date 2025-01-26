import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../components/layout/tab-bar';
import { useColorScheme } from 'nativewind';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <TabBar
          activeTab={props.state.index === 0 ? 'home' : 'setting'}
          onChangeTab={(tab) => {
            props.navigation.navigate(tab === 'home' ? 'index' : tab);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="setting" />
    </Tabs>
  );
}
