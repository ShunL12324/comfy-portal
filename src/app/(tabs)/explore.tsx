import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Field, FieldLabel, useDesign } from '@/components/ui/design-system/primitives';
import { Sheet } from '@/components/ui/design-system/overlays';
import { Plus } from '@/constants/icons';
import { EmptyState } from '@/components/self-ui/empty-state';
import { EmptyEnvironmentsArt } from '@/features/cloud/components/empty-environments-art';
import { BUILT_IN_ENVIRONMENTS } from '@/features/cloud/built-in';
import { EnvironmentCard } from '@/features/cloud/components/environment-card';
import { EditEnvironmentSheet } from '@/features/cloud/components/edit-environment-sheet';
import { useEnvironmentStore } from '@/features/cloud/stores/environment-store';
import { designTokens as t } from '@/constants/design-tokens';

export default function EnvironmentsScreen() {
  const c = useDesign();
  const router = useRouter();
  const { environments, addEnvironment } = useEnvironmentStore();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const matches = (item: { name: string; description: string }) =>
    (item.name + ' ' + item.description).toLowerCase().includes(query.toLowerCase());
  const filtered = environments.filter(matches);
  const examples = BUILT_IN_ENVIRONMENTS.filter((example) => matches(example.environment));
  const create = () => {
    if (!name.trim()) return;
    const id = addEnvironment({
      name: name.trim(),
      description: description.trim(),
      models: [],
      extensions: [],
      workflows: [],
    });
    setCreating(false);
    setName('');
    setDescription('');
    router.navigate(`/templates/${id}`);
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title="Environments"
        rightElement={<Action icon={Plus} label="Create environment" onPress={() => setCreating(true)} />}
      />
      <ScrollView
        style={{ flex: 1 }}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: t.layout.gutter,
          paddingBottom: t.layout.gutter,
          gap: t.layout.inset,
        }}
      >
        {(environments.length > 0 || BUILT_IN_ENVIRONMENTS.length > 0) && (
          <Field
            label="Search environments"
            search
            value={query}
            onChange={setQuery}
            placeholder="Search environments"
          />
        )}
        <View style={{ flex: environments.length || BUILT_IN_ENVIRONMENTS.length ? undefined : 1, gap: t.layout.list }}>
          {filtered.map((item) => (
            <EnvironmentCard key={item.id} environment={item} onLongPress={setEditingId} />
          ))}
          {!environments.length && !query ? (
            // Your own list is empty. With examples below, the illustration takes its natural
            // height instead of the whole screen, so the examples stay in view.
            <View style={examples.length ? { paddingVertical: t.layout.section } : { flex: 1 }}>
              <EmptyState
                testID="environments-empty"
                align="center"
                art={<EmptyEnvironmentsArt />}
                title="No environments yet"
              >
                Bundle models, extensions and workflows for a GPU.
              </EmptyState>
            </View>
          ) : (
            !filtered.length &&
            !examples.length && <EmptyState title="No matching environments">Try another search.</EmptyState>
          )}
        </View>
        {!!examples.length && (
          <View testID="environment-examples" style={{ gap: t.layout.list, paddingTop: t.layout.related }}>
            <View style={{ gap: t.layout.label }}>
              <FieldLabel>Examples</FieldLabel>
              <Copy muted size="metadata">
                Ready-made recipes. Open one to see what it installs, then use it to get your own copy.
              </Copy>
            </View>
            {examples.map((example) => (
              <EnvironmentCard key={example.id} environment={example.environment} />
            ))}
          </View>
        )}
      </ScrollView>
      <Sheet open={creating} onClose={() => setCreating(false)} title="New environment">
        <Field label="Name" value={name} onChange={setName} placeholder="Environment name" />
        <Field
          label="Description"
          multiline
          value={description}
          onChange={setDescription}
          placeholder="What this environment is for"
        />
        <Action kind="primary" fill disabled={!name.trim()} onPress={create}>
          Create environment
        </Action>
      </Sheet>
      <EditEnvironmentSheet environmentId={editingId} open={!!editingId} onClose={() => setEditingId(undefined)} />
    </View>
  );
}
