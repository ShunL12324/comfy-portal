import { FilterChips } from '@/components/ui/design-system/filter-chips';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { SvgXml } from 'react-native-svg';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Field, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Sheet } from '@/components/ui/design-system/overlays';
import { OptionSelector } from '@/components/common/selectors/option-selector';
import { Plus, ChevronRight, GitBranch, Trash2 } from '@/constants/icons';
import { useEnvironmentStore } from '@/features/cloud/stores/environment-store';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { providerLogos } from '@/features/cloud/components/provider-logos';
import { MODEL_TYPES, resolveModelUrl } from '@/services/model-url';
import { parseWorkflowTemplate } from '@/features/workflow/utils/workflow-parser';
import { uniqueCopyName } from '@/features/workflow/utils/copy-name';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { showToast } from '@/utils/toast';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

const modelLabels: Record<string, string> = {
  checkpoints: 'Checkpoint',
  loras: 'LoRA',
  diffusion_models: 'Diffusion',
  text_encoders: 'Text encoder',
  vae: 'VAE',
  upscale_models: 'Upscaler',
  clip_vision: 'CLIP vision',
  controlnet: 'ControlNet',
  embeddings: 'Embedding',
};
const letters: Record<string, string> = {
  checkpoints: 'C',
  loras: 'L',
  diffusion_models: 'D',
  text_encoders: 'T',
  vae: 'V',
  upscale_models: 'U',
};
function provider(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === 'huggingface.co' ? 'huggingface' : host === 'civitai.com' ? 'civitai' : null;
  } catch {
    return null;
  }
}

export default function EnvironmentResources() {
  const { id, resource } = useLocalSearchParams<{ id: string; resource: string }>();
  const c = useDesign();
  const environment = useEnvironmentStore((state) => state.environments.find((item) => item.id === id));
  const update = useEnvironmentStore((state) => state.updateEnvironment);
  const library = useWorkflowStore((state) => state.assets);
  const key = useCloudCredentialsStore((state) => state.civitaiApiKey);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [type, setType] = useState('checkpoints');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = resource === 'models' ? 'Models' : resource === 'extensions' ? 'Extensions' : 'Workflows';
  const model = environment?.models.find((item) => item.url === selected);
  const workflow = environment?.workflows.find((item) => item.name === selected);
  const rows = useMemo(() => {
    if (!environment) return [];
    if (resource === 'models')
      return environment.models
        .filter((item) => filter === 'all' || item.type === filter)
        .map((item) => ({
          key: item.url,
          name: item.label || item.filename || item.url,
          detail: modelLabels[item.type] || item.type,
          model: item,
        }));
    if (resource === 'extensions')
      return environment.extensions.map((item) => ({
        key: item,
        name:
          item
            .split('/')
            .pop()
            ?.replace(/\.git$/, '') || item,
        detail: item,
        model: undefined,
      }));
    return environment.workflows.map((item) => ({
      key: item.name,
      name: item.name,
      detail: `${Object.keys(item.data).length} nodes`,
      model: undefined,
    }));
  }, [environment, filter, resource]);
  const addWorkflow = (name: string, data: Parameters<typeof parseWorkflowTemplate>[0]) => {
    const current = useEnvironmentStore.getState().environments.find((item) => item.id === id);
    if (!current) return;
    update(id, {
      workflows: [
        ...current.workflows,
        {
          name: uniqueCopyName(
            name,
            current.workflows.map((item) => item.name),
          ),
          data: parseWorkflowTemplate(data),
        },
      ],
    });
    setAdding(false);
    showToast.success('Workflow imported');
  };
  const importFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      addWorkflow(
        result.assets[0].name.replace(/\.json$/i, ''),
        JSON.parse(
          Platform.OS === 'web'
            ? await (await fetch(result.assets[0].uri)).text()
            : await new File(result.assets[0].uri).text(),
        ),
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not import workflow');
    }
  };
  const add = async () => {
    if (!environment || busy) return;
    setBusy(true);
    setError('');
    try {
      if (resource === 'models') {
        const resolved = await resolveModelUrl(url.trim(), key);
        const current = useEnvironmentStore.getState().environments.find((item) => item.id === id);
        if (!current) return;
        update(id, {
          models: [
            ...current.models.filter((item) => item.url !== resolved.url),
            { ...resolved, pageUrl: url.trim(), type: resolved.suggestedType || type },
          ],
        });
      } else {
        const parsed = new URL(url.trim());
        if (
          parsed.protocol !== 'https:' ||
          parsed.hostname !== 'github.com' ||
          parsed.pathname.split('/').filter(Boolean).length !== 2
        )
          throw new Error('Use a GitHub repository URL, such as https://github.com/owner/repository.');
        const current = useEnvironmentStore.getState().environments.find((item) => item.id === id);
        if (!current) return;
        update(id, { extensions: [...new Set([...current.extensions, parsed.toString().replace(/\/$/, '')])] });
      }
      setAdding(false);
      setUrl('');
      showToast.success('Added');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not add resource');
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    if (!environment || !selected) return;
    if (resource === 'models') update(id, { models: environment.models.filter((item) => item.url !== selected) });
    else if (resource === 'extensions')
      update(id, { extensions: environment.extensions.filter((item) => item !== selected) });
    else update(id, { workflows: environment.workflows.filter((item) => item.name !== selected) });
    setSelected(null);
    showToast.success('Removed from environment');
  };
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title={title}
        titleSize="sm"
        showBack
        rightElement={
          <Action
            kind="tonal"
            icon={Plus}
            label={`Add ${title.toLowerCase()}`}
            onPress={() => {
              setAdding(true);
              setError('');
            }}
          />
        }
      />
      <View style={{ paddingHorizontal: t.layout.gutter, paddingBottom: t.layout.field, gap: t.layout.related }}>
        <Copy muted size="metadata">
          {environment?.name} · {rows.length} {title.toLowerCase()}
        </Copy>
        <Field
          label={`Search ${title.toLowerCase()}`}
          search
          value={query}
          onChange={setQuery}
          placeholder={`Search ${title.toLowerCase()}`}
        />
      </View>
      {resource === 'models' && (
        <View style={{ paddingHorizontal: t.layout.gutter, paddingBottom: t.layout.field }}>
          <FilterChips
            label="Model type"
            value={filter}
            onChange={setFilter}
            options={['all', ...new Set(environment?.models.map((item) => item.type) ?? [])].map((value) => ({
              value,
              label: value === 'all' ? 'All' : modelLabels[value] || value,
              count:
                value === 'all'
                  ? environment?.models.length
                  : environment?.models.filter((item) => item.type === value).length,
            }))}
          />
        </View>
      )}
      <ScrollView
        testID="environment-resource-list"
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{
          paddingHorizontal: t.layout.gutter,
          paddingBottom: t.layout.section,
          gap: t.layout.list,
        }}
      >
        {rows
          .filter((item) => (item.name + item.detail).toLowerCase().includes(query.toLowerCase()))
          .map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => setSelected(item.key)}
              style={{
                paddingHorizontal: t.layout.rowX,
                paddingVertical: t.layout.rowY,
                minHeight: 64,
                borderRadius: t.radius.panel,
                backgroundColor: c.card,
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.layout.related,
              }}
            >
              {resource === 'extensions' && (
                <SvgXml xml={providerLogos.github.replaceAll('currentColor', c.ink)} width={24} height={24} />
              )}
              {resource === 'workflows' && (
                <View
                  style={{
                    width: t.height.touch,
                    height: t.height.touch,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: c.raised,
                    borderRadius: t.radius.small,
                  }}
                >
                  <GitBranch size={t.icon.large} color={c.secondary} strokeWidth={iconStroke(t.icon.large)} />
                </View>
              )}
              <View style={{ flex: 1, gap: t.layout.label }}>
                <Row style={{ gap: t.layout.status }}>
                  <Copy numberOfLines={1} style={{ flexShrink: 1 }}>
                    {item.name}
                  </Copy>
                  {item.model && (
                    <Row style={{ gap: t.layout.status }}>
                      <View
                        style={{
                          minWidth: 20,
                          height: 18,
                          borderRadius: t.radius.small,
                          backgroundColor: c.raised,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Copy size="micro">{letters[item.model.type] || item.model.type[0].toUpperCase()}</Copy>
                      </View>
                      {!!provider(item.model.pageUrl || item.model.url) && (
                        <SvgXml
                          xml={providerLogos[provider(item.model.pageUrl || item.model.url)!]}
                          width={12}
                          height={12}
                        />
                      )}
                    </Row>
                  )}
                </Row>
                <Copy muted size="metadata" numberOfLines={1}>
                  {item.model
                    ? `${provider(item.model.pageUrl || item.model.url) === 'huggingface' ? 'Hugging Face' : provider(item.model.pageUrl || item.model.url) === 'civitai' ? 'Civitai' : 'Direct URL'} · ${item.detail}`
                    : item.detail.replace('https://', '')}
                </Copy>
              </View>
              <ChevronRight size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={c.muted} />
            </Pressable>
          ))}
        {!rows.length && <Copy muted>No {title.toLowerCase()} yet.</Copy>}
      </ScrollView>
      <Sheet
        compactTitle

        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          resource === 'models'
            ? 'Model details'
            : resource === 'extensions'
              ? 'Extension details'
              : workflow?.name || 'Workflow'
        }
      >
        {model && (
          <>
            <Copy muted size="metadata">
              Filename
            </Copy>
            <Copy size="body">{model.filename || model.label || model.url}</Copy>
            <Copy muted size="metadata">
              Model page
            </Copy>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open model page"
              onPress={() => void Linking.openURL(model.pageUrl || model.url)}
              style={{
                backgroundColor: c.card,
                borderRadius: t.radius.small,
                paddingHorizontal: t.layout.rowX,
                paddingVertical: t.layout.rowY,
                minHeight: t.height.touch,
              }}
            >
              <Copy size="label">{model.pageUrl || model.url}</Copy>
            </Pressable>
          </>
        )}
        {resource === 'extensions' && !!selected && (
          <>
            <Copy muted size="metadata">
              Repository
            </Copy>
            <Copy>
              {selected
                .split('/')
                .pop()
                ?.replace(/\.git$/, '')}
            </Copy>
            <Copy muted size="metadata">
              GitHub repository
            </Copy>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open GitHub repository"
              onPress={() => void Linking.openURL(selected)}
              style={{
                backgroundColor: c.card,
                borderRadius: t.radius.small,
                paddingHorizontal: t.layout.rowX,
                paddingVertical: t.layout.rowY,
                minHeight: t.height.touch,
              }}
            >
              <Copy size="label">{selected}</Copy>
            </Pressable>
          </>
        )}
        {workflow && (
          <>
            <Copy muted size="metadata">
              {Object.keys(workflow.data).length} nodes
            </Copy>
            <View style={{ gap: t.layout.list }}>
              {Object.entries(workflow.data).map(([nodeId, node]) => (
                <Row
                  key={nodeId}
                  style={{
                    minHeight: t.height.control,
                    paddingHorizontal: t.layout.rowX,
                    backgroundColor: c.card,
                    borderRadius: t.radius.small,
                  }}
                >
                  <Copy mono muted size="metadata">
                    {nodeId.padStart(2, '0')}
                  </Copy>
                  <Copy size="label">{node._meta?.title || node.class_type}</Copy>
                </Row>
              ))}
            </View>
          </>
        )}
        <Action kind="secondary" destructive icon={Trash2} fill onPress={remove}>
          Delete {resource === 'models' ? 'model' : resource === 'extensions' ? 'extension' : 'workflow'}
        </Action>
      </Sheet>
      <Sheet
        open={adding}
        onClose={() => {
          if (!busy) setAdding(false);
        }}
        title={`Add ${title.toLowerCase()}`}
      >
        {resource === 'workflows' ? (
          <>
            <Action onPress={importFile}>Import JSON file</Action>
            {library.map((item) => (
              <Action key={item.id} onPress={() => addWorkflow(item.name, item.data)}>
                {item.name}
              </Action>
            ))}
          </>
        ) : (
          <>
            <Field
              label={resource === 'models' ? 'Model page or download URL' : 'GitHub repository URL'}
              value={url}
              onChange={setUrl}
              placeholder="https://…"
            />
            {resource === 'models' && (
              <OptionSelector
                value={type}
                onChange={setType}
                title="Model type"
                options={MODEL_TYPES.map((value) => ({ value, label: modelLabels[value] || value }))}
              />
            )}
            <Action kind="primary" disabled={!url.trim()} loading={busy} onPress={add}>
              Add {resource === 'models' ? 'model' : 'extension'}
            </Action>
          </>
        )}
        {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
      </Sheet>
    </SafeAreaView>
  );
}
