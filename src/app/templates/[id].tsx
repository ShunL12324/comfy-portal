import { useRef, useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppBar } from '@/components/layout/app-bar';
import { Action, ActionRow, Copy, Field, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Sheet } from '@/components/ui/design-system/overlays';
import { AlertTriangle, Box, GitBranch, Puzzle, Settings2 } from '@/constants/icons';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { showToast } from '@/utils/toast';
import type { Environment } from '@/features/cloud/types';
import { useEnvironmentStore, useEnvironmentsHydrated } from '@/features/cloud/stores/environment-store';
import { Spinner } from '@/components/ui/spinner';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EnvironmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const hydrated = useEnvironmentsHydrated();
  const current = useEnvironmentStore((state) => state.environments.find((item) => item.id === id));
  // Keep the last seen recipe while the page leaves after a delete, so it never flashes "not found".
  const lastSeen = useRef<Environment | undefined>(current);
  if (current) lastSeen.current = current;
  const environment = current ?? lastSeen.current;
  const update = useEnvironmentStore((state) => state.updateEnvironment);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  if (!hydrated) return <Spinner />;
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
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title={environment.name}
        titleSize="sm"
        showBack
        rightElement={
          <Action
            kind="text"
            icon={Settings2}
            label="Edit environment"
            onPress={() => {
              setName(environment.name);
              setDescription(environment.description);
              setEditing(true);
            }}
          />
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
          Changes apply to future builds. Running servers stay unchanged.
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
        <Action
          kind="primary"
          fill
          onPress={() => router.navigate({ pathname: '/cloud/launch', params: { environmentId: id } })}
        >
          Create instance
        </Action>
      </View>
      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit environment">
        <Field label="Name" value={name} onChange={setName} placeholder="Environment name" />
        <Field label="Description" multiline value={description} onChange={setDescription} placeholder="Description" />
        <ActionRow>
          <Action kind="secondary" fill onPress={() => setEditing(false)}>
            Cancel
          </Action>
          <Action
            kind="primary"
            fill
            disabled={!name.trim()}
            onPress={() => {
              update(id, { name: name.trim(), description: description.trim() });
              setEditing(false);
            }}
          >
            Save changes
          </Action>
        </ActionRow>
        <Action kind="primary" destructive fill icon={AlertTriangle} onPress={() => setConfirmingDelete(true)}>
          Delete environment
        </Action>
      </Sheet>
      <ConfirmDialog
        isOpen={confirmingDelete}
        destructive
        title="Delete environment?"
        description="Delete this recipe and its model, extension and workflow lists from the app. Servers already built from it keep running with their own copy; nothing is destroyed or billed."
        confirmText="Delete environment"
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          setEditing(false);
          router.back();
          useEnvironmentStore.getState().removeEnvironment(id);
          showToast.success('Environment deleted');
        }}
      />
    </View>
  );
}
