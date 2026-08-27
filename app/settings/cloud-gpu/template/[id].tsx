import { AppBar } from '@/components/layout/app-bar';
import { BottomSheetProvider } from '@/context/bottom-sheet-context';
import { FormInput } from '@/components/self-ui/form-input';
import { StyledTextarea } from '@/components/self-ui/styled-textarea';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { ModelRow } from '@/features/cloud/components/model-row';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { useTemplateStore } from '@/features/cloud/stores/template-store';
import { estimateDiskGb, type GpuTemplate, type TemplateModel } from '@/features/cloud/types';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { parseWorkflowTemplate } from '@/features/workflow/utils/workflow-parser';
import { formatBytes, resolveModelUrl } from '@/services/model-url';
import { showToast } from '@/utils/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Plus, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TemplateEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const { getTemplate, addTemplate, updateTemplate } = useTemplateStore();
  const civitaiApiKey = useCloudCredentialsStore((s) => s.civitaiApiKey);
  const localWorkflows = useWorkflowStore((s) => s.workflow);

  const existing = isNew ? undefined : getTemplate(id);

  const [name, setName] = useState(existing?.name ?? '');
  const [gpuQuery, setGpuQuery] = useState(existing?.gpuQuery ?? 'RTX 4090');
  const [models, setModels] = useState<TemplateModel[]>(existing?.models ?? []);
  const [extensions, setExtensions] = useState<string[]>(existing?.extensions ?? []);
  const [workflows, setWorkflows] = useState(existing?.workflows ?? []);

  const [modelInput, setModelInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [modelError, setModelError] = useState('');
  const [extensionInput, setExtensionInput] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');

  const diskGb = useMemo(() => estimateDiskGb(models), [models]);
  const knownSize = models.reduce((sum, m) => sum + (m.sizeBytes ?? 0), 0);

  const addModel = async () => {
    setModelError('');
    setResolving(true);
    try {
      const resolved = await resolveModelUrl(modelInput, civitaiApiKey);
      setModels((prev) => [
        ...prev,
        {
          url: resolved.url,
          // Civitai tells us what the file is; otherwise start at checkpoints
          // and let the user correct it.
          type: resolved.suggestedType ?? 'checkpoints',
          filename: resolved.filename,
          sizeBytes: resolved.sizeBytes,
          label: resolved.label,
        },
      ]);
      setModelInput('');
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Could not resolve that URL');
    } finally {
      setResolving(false);
    }
  };

  const addExtension = () => {
    const url = extensionInput.trim();
    if (!url) return;
    if (!/^https?:\/\/.+\/.+/.test(url)) {
      showToast.error('Invalid', 'Paste a git repository URL', insets.top + 8);
      return;
    }
    setExtensions((prev) => [...prev, url]);
    setExtensionInput('');
  };

  const addWorkflowFromJson = () => {
    try {
      const parsed = parseWorkflowTemplate(JSON.parse(workflowJson));
      setWorkflows((prev) => [...prev, { name: `Workflow ${prev.length + 1}`, data: parsed }]);
      setWorkflowJson('');
    } catch {
      showToast.error('Invalid', 'That is not a valid workflow JSON', insets.top + 8);
    }
  };

  const addWorkflowFromLibrary = (workflowId: string) => {
    const source = localWorkflows.find((w) => w.id === workflowId);
    if (!source) return;
    // A copy, not a reference: WorkflowRecord is tied to a server, and this
    // template has to survive being exported to a device that has neither.
    setWorkflows((prev) => [...prev, { name: source.name, data: source.data }]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast.error('Error', 'Give the template a name', insets.top + 8);
      return;
    }
    const payload: Omit<GpuTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      gpuQuery: gpuQuery.trim(),
      models,
      extensions,
      workflows,
      disk: diskGb,
    };
    if (isNew) addTemplate(payload);
    else updateTemplate(id, payload);
    router.back();
  };

  const alreadyAdded = (workflowName: string) => workflows.some((w) => w.name === workflowName);

  return (
    <View className="bg-background-0 flex-1">
      <AppBar title={isNew ? 'New Template' : 'Edit Template'} showBack />
      {/* These inputs go through AdaptiveTextInput, and BottomSheetContext
          defaults to true — so on a plain screen they'd render the BottomSheet
          variant and reach for a sheet that isn't there. */}
      <BottomSheetProvider isInSheet={false}>
        <ScrollView className="flex-1">
          <VStack className="px-5 pb-8 pt-4" space="md">
            <FormInput title="Name" defaultValue={name} onChangeText={setName} placeholder="e.g. Qwen image edit" />
            <FormInput title="GPU" defaultValue={gpuQuery} onChangeText={setGpuQuery} placeholder="RTX 4090" />
            <Text className="-mt-2 text-xs text-typography-400">
              vast&apos;s short name for the card, used to search offers.
            </Text>

            {/* ---- Models ---- */}
            <SectionHeader
              title="Models"
              subtitle={
                models.length
                  ? `${models.length} file${models.length === 1 ? '' : 's'}${knownSize ? ` · ${formatBytes(knownSize)}` : ''} · ${diskGb} GB disk`
                  : 'Paste a HuggingFace or Civitai link'
              }
            />
            <VStack space="xs">
              <FormInput
                title=""
                defaultValue={modelInput}
                onChangeText={setModelInput}
                placeholder="https://civitai.com/models/... or huggingface.co/..."
                autoCapitalize="none"
                autoCorrect={false}
                error={modelError}
              />
              <Button
                variant="outline"
                size="sm"
                onPress={addModel}
                isDisabled={resolving || !modelInput.trim()}
                style={{ width: 108 }}
                className="rounded-lg"
              >
                {resolving ? <Spinner size="small" /> : <ButtonText className="text-xs">Add</ButtonText>}
              </Button>
            </VStack>
            {models.map((model, index) => (
              <ModelRow
                key={`${model.url}-${index}`}
                model={model}
                onChangeType={(type) => setModels((prev) => prev.map((m, i) => (i === index ? { ...m, type } : m)))}
                onRemove={() => setModels((prev) => prev.filter((_, i) => i !== index))}
              />
            ))}

            {/* ---- Extensions ---- */}
            <SectionHeader title="Extensions" subtitle="Custom node repositories to clone" />
            <VStack space="xs">
              <FormInput
                title=""
                defaultValue={extensionInput}
                onChangeText={setExtensionInput}
                placeholder="https://github.com/user/ComfyUI-Something"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button
                variant="outline"
                size="sm"
                onPress={addExtension}
                isDisabled={!extensionInput.trim()}
                style={{ width: 108 }}
                className="rounded-lg"
              >
                <ButtonText className="text-xs">Add</ButtonText>
              </Button>
            </VStack>
            {extensions.map((url, index) => (
              <HStack key={`${url}-${index}`} className="rounded-xl bg-background-50 p-3 items-center justify-between">
                <Text className="text-xs text-typography-700 flex-1" numberOfLines={1}>
                  {url.replace('https://github.com/', '')}
                </Text>
                <Pressable onPress={() => setExtensions((prev) => prev.filter((_, i) => i !== index))} className="p-1">
                  <Icon as={Trash2} size="xs" className="text-error-400" />
                </Pressable>
              </HStack>
            ))}

            {/* ---- Workflows ---- */}
            <SectionHeader title="Workflows" subtitle="Copied into the template, so it stays complete on its own" />
            {workflows.map((workflow, index) => (
              <HStack
                key={`${workflow.name}-${index}`}
                className="rounded-xl bg-background-50 p-3 items-center justify-between"
              >
                <Text className="text-sm text-typography-900 flex-1" numberOfLines={1}>
                  {workflow.name}
                </Text>
                <Pressable onPress={() => setWorkflows((prev) => prev.filter((_, i) => i !== index))} className="p-1">
                  <Icon as={Trash2} size="xs" className="text-error-400" />
                </Pressable>
              </HStack>
            ))}

            {localWorkflows.length > 0 && (
              <VStack space="xs">
                <Text className="text-xs text-typography-400">From this device</Text>
                {localWorkflows.map((workflow) => {
                  const added = alreadyAdded(workflow.name);
                  return (
                    <Pressable
                      key={workflow.id}
                      onPress={() => !added && addWorkflowFromLibrary(workflow.id)}
                      className="rounded-xl border-background-100 p-3 flex-row items-center justify-between border-[0.5px] active:opacity-70"
                    >
                      <Text className="text-sm text-typography-700 flex-1" numberOfLines={1}>
                        {workflow.name}
                      </Text>
                      <Icon
                        as={added ? Check : Plus}
                        size="xs"
                        className={added ? 'text-success-500' : 'text-primary-500'}
                      />
                    </Pressable>
                  );
                })}
              </VStack>
            )}

            <VStack space="xs">
              <Text className="text-xs text-typography-400">Or paste workflow JSON</Text>
              <StyledTextarea
                value={workflowJson}
                onChangeText={setWorkflowJson}
                placeholder="{ ... }"
                minHeight={70}
              />
              <Button
                variant="outline"
                size="sm"
                onPress={addWorkflowFromJson}
                isDisabled={!workflowJson.trim()}
                style={{ width: 108 }}
                className="rounded-lg"
              >
                <ButtonText className="text-xs">Add</ButtonText>
              </Button>
            </VStack>

            <HStack space="sm" className="mt-4">
              <Button variant="outline" onPress={() => router.back()} className="rounded-lg flex-1">
                <HStack space="xs" className="items-center">
                  <Icon as={X} size="xs" className="text-typography-500" />
                  <ButtonText className="text-typography-500">Cancel</ButtonText>
                </HStack>
              </Button>
              <Button onPress={handleSave} className="rounded-lg bg-primary-500 flex-1">
                <ButtonText>Save</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </ScrollView>
      </BottomSheetProvider>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <VStack space="xs" className="mt-2">
      <Text className="text-sm font-medium text-typography-600">{title}</Text>
      <Text className="text-xs text-typography-400">{subtitle}</Text>
    </VStack>
  );
}
