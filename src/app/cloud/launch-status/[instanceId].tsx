import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { useProvisioningStore } from '@/features/cloud/stores/provisioning-store';
import { SetupContent } from '@/features/cloud/components/setup-content';

export default function SetupScreen() {
  const { instanceId } = useLocalSearchParams<{ instanceId: string }>();
  const currentLaunch = useProvisioningStore((state) => state.get(instanceId));
  const [initialLaunch, setInitialLaunch] = useState(() => useProvisioningStore.getState().get(instanceId));
  const launch = currentLaunch ?? initialLaunch;
  useEffect(() => useProvisioningStore.subscribe(state => {
    const record = state.get(instanceId);
    if (record) setInitialLaunch(record);
  }), [instanceId]);
  const c = useDesign();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo('/');
      return true;
    });
    return () => listener.remove();
  }, [router]);
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <AppBar title="Setup" titleSize="sm" centerTitle />
      <ScrollView contentContainerStyle={{ paddingHorizontal: t.layout.gutter, paddingBottom: t.layout.inset }}>
        {launch ? <SetupContent launch={launch} onDestroyed={() => router.dismissTo('/')} /> : <Copy>Installation not found.</Copy>}
      </ScrollView>
      <View style={{ paddingHorizontal: t.layout.gutter, paddingBottom: insets.bottom + t.layout.field }}>
        <Action kind="primary" fill onPress={() => router.dismissTo('/')}>
          Back to Servers
        </Action>
      </View>
    </View>
  );
}
