import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sidebar } from '../../components/layout/sidebar';
import { TabBar, TabRoute } from '../../components/layout/tab-bar';

export default function TabLayout() {
  const { isTabletWidth } = useDeviceLayout();
  const router = useRouter();
  const pathname = usePathname();

  const getActiveTabFromPathname = (): TabRoute => {
    if (pathname === '/setting' || pathname.startsWith('/setting')) return 'setting';
    if (pathname === '/explore' || pathname.startsWith('/explore')) return 'explore';
    return 'server';
  };

  const getActiveTabNameByRoute = (routeName: string): TabRoute => {
    if (routeName === 'index') return 'server';
    if (routeName === 'explore') return 'explore';
    if (routeName === 'setting') return 'setting';
    return 'server';
  };

  const handleSidebarTabChange = (tab: TabRoute) => {
    const screenName = tab === 'server' ? '/' : `/${tab}`;
    router.navigate(screenName as any);
  };

  const tabs = (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        if (isTabletWidth) return null;

        const currentRouteName = props.state.routes[props.state.index]?.name;
        const activeTab = getActiveTabNameByRoute(currentRouteName);

        return (
          <TabBar
            activeTab={activeTab}
            onChangeTab={(tab: TabRoute) => {
              const screenName = tab === 'server' ? 'index' : tab;
              props.navigation.navigate(screenName);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Servers' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="setting" options={{ title: 'Settings' }} />
    </Tabs>
  );

  if (isTabletWidth) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Sidebar
          activeTab={getActiveTabFromPathname()}
          onChangeTab={handleSidebarTabChange}
        />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {tabs}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {tabs}
    </SafeAreaView>
  );
}
