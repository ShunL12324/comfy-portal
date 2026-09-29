import { Action, Copy, Title, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { View } from '@/components/ui/view';
import { useRouter } from 'expo-router';
export default function NotFoundScreen() {
  const router = useRouter();
  const c = useDesign();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.paper,
        padding: t.layout.section,
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: t.layout.field,
      }}
    >
      <Title>Page unavailable</Title>
      <Copy muted>This link no longer points to an available page.</Copy>
      <Action kind="primary" onPress={() => router.dismissTo('/')}>Open workspace</Action>
    </View>
  );
}
