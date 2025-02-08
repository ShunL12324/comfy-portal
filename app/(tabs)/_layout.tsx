import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../../components/layout/tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <TabBar
          activeTab={props.state.index === 0 ? 'server' : 'setting'}
          onChangeTab={(tab) => {
            props.navigation.navigate(tab === 'server' ? 'index' : tab);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="setting" />
    </Tabs>
  );
}
