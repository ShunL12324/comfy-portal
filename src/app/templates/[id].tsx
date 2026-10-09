import { useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Fact } from '@/components/ui/design-system/list-card';
import { Box, GitBranch, Gpu, HardDrive, Puzzle, Settings2 } from '@/constants/icons';
import { copyBuiltInEnvironment } from '@/features/cloud/built-in';
import { EditEnvironmentSheet } from '@/features/cloud/components/edit-environment-sheet';
import { useEnvironmentRecipe } from '@/features/cloud/hooks/use-environment-recipe';
import type { Environment } from '@/features/cloud/types';
import { useEnvironmentsHydrated } from '@/features/cloud/stores/environment-store';
import { environmentSize } from '@/features/cloud/utils/environment-summary';
import { showToast } from '@/utils/toast';
import { Spinner } from '@/components/ui/spinner';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EnvironmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const hydrated = useEnvironmentsHydrated();
  const { environment: current, example } = useEnvironmentRecipe(id);
  // Keep the last seen recipe while the page leaves after a delete, so it never flashes "not found".
  const [lastSeen, setLastSeen] = useState<Environment | undefined>(current);
  if (current && current !== lastSeen) setLastSeen(current);
  const environment = current ?? lastSeen;
  const [editing, setEditing] = useState(false);
  if (!hydrated && !example) return <Spinner />;
  if (!environment)
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <AppBar title="Environment" showBack />
        <Copy>Environment not found.</Copy>
      </View>
    );
  const resources = [
    {
      key: 'models',
      title: 'Models',
      detail: 'Model files for generation',
      count: environment.models.length,
      icon: Box,
    },
    {
      key: 'extensions',
      title: 'Extensions',
      detail: 'Custom nodes and integrations',
      count: environment.extensions.length,
      icon: Puzzle,
    },
    {
      key: 'workflows',
      title: 'Workflows',
      detail: 'Workflow files for generation',
      count: environment.workflows.length,
      icon: GitBranch,
    },
  ] as const;
  const size = example && environmentSize(environment.models);
  const copyExample = () => {
    if (!example) return;
    const copyId = copyBuiltInEnvironment(example);
    showToast.success('Added to your environments');
    router.replace(`/templates/${copyId}`);
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title={environment.name}
        titleSize="sm"
        showBack
        rightElement={
          example ? undefined : (
            <Action kind="text" icon={Settings2} label="Edit environment" onPress={() => setEditing(true)} />
          )
        }
      />
      <ScrollView
        testID="environment-content"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: t.layout.gutter,
          gap: t.layout.field,
          paddingBottom: t.layout.inset,
        }}
      >
        {!!environment.description && <Copy muted>{environment.description}</Copy>}
        {example && (
          <Row style={{ gap: t.layout.related, flexWrap: 'wrap' }}>
            {size && <Fact badge icon={HardDrive} mono={size.mono} value={size.text} label="download" />}
            <Fact badge icon={Gpu} value={`${example.gpuMemoryGb} GB`} label="GPU memory" />
          </Row>
        )}
        {resources.map(({ key, title, detail, count, icon: Icon }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={() =>
              router.navigate({ pathname: '/environments/[id]/[resource]', params: { id, resource: key } })
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.layout.field,
              paddingHorizontal: t.layout.rowX,
              paddingVertical: t.layout.rowY,
              borderRadius: t.radius.panel,
              backgroundColor: c.card,
            }}
          >
            <View
              style={{
                width: t.height.control,
                height: t.height.control,
                borderRadius: t.radius.small,
                backgroundColor: c.raised,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={t.icon.large} strokeWidth={iconStroke(t.icon.large)} color={c.secondary} />
            </View>
            <View style={{ flex: 1, gap: t.layout.label }}>
              <Row style={{ gap: t.layout.related }}>
                <Copy size="section" style={{ fontWeight: '500' }}>
                  {title}
                </Copy>
                <Copy muted size="metadata">
                  {count}
                </Copy>
              </Row>
              <Copy muted size="label">
                {detail}
              </Copy>
            </View>
          </Pressable>
        ))}
        <Copy muted size="metadata">
          {example
            ? `Built-in example, read-only. Needs ComfyUI ${example.minComfyUI} or later. Use it to get your own copy to edit and launch.`
            : 'Changes apply to future builds. Running servers stay unchanged.'}
        </Copy>
      </ScrollView>
      <View
        style={{
          backgroundColor: c.paper,
          paddingHorizontal: t.layout.gutter,
          paddingTop: t.layout.related,
          paddingBottom: Math.max(insets.bottom, t.layout.field),
        }}
      >
        {example ? (
          <Action kind="primary" fill onPress={copyExample}>
            Use this environment
          </Action>
        ) : (
          <Action
            kind="primary"
            fill
            onPress={() => router.navigate({ pathname: '/cloud/launch', params: { environmentId: id } })}
          >
            Create instance
          </Action>
        )}
      </View>
      <EditEnvironmentSheet
        environmentId={id}
        open={editing && !example}
        onClose={() => setEditing(false)}
        onDeleted={() => router.back()}
      />
    </View>
  );
}
