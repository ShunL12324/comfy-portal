import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Field, useDesign } from '@/components/ui/design-system/primitives';
import { Sheet } from '@/components/ui/design-system/overlays';
import { Plus } from '@/constants/icons';
import { EnvironmentCard } from '@/features/cloud/components/environment-card';
import { useEnvironmentStore } from '@/features/cloud/stores/environment-store';
import { designTokens as t } from '@/constants/design-tokens';

export default function EnvironmentsScreen() {
  const c = useDesign();
  const router = useRouter();
  const { environments, addEnvironment } = useEnvironmentStore();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const filtered = environments.filter((item) =>
    (item.name + ' ' + item.description).toLowerCase().includes(query.toLowerCase()),
  );
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
    router.push(`/templates/${id}`);
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
        <Field label="Search environments" search value={query} onChange={setQuery} placeholder="Search environments" />
        <View style={{ gap: t.layout.list }}>
          {filtered.map((item) => (
            <EnvironmentCard key={item.id} environment={item} />
          ))}
          {!filtered.length && (
            <View style={{ paddingVertical: t.layout.section, gap: t.layout.label }}>
              <Copy>{query ? 'No matching environments' : 'Your environments'}</Copy>
              <Copy muted>
                {query ? 'Try another search.' : 'Add an environment to collect models, extensions and workflows.'}
              </Copy>
            </View>
          )}
        </View>
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
    </View>
  );
}
