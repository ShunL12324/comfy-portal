import { AppBar } from '@/components/layout/app-bar';
import { EmptyState } from '@/components/self-ui/empty-state';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useTemplateStore } from '@/features/cloud/stores/template-store';
import { exportTemplate, parseTemplateFile } from '@/features/cloud/utils/template-io';
import { CLOUD_GPU_SUPPORTED, CLOUD_GPU_UNSUPPORTED_REASON } from '@/features/cloud/utils/availability';
import { showToast } from '@/utils/toast';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estimateDiskGb } from '@/features/cloud/types';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { useRouter } from 'expo-router';
import { ChevronRight, CloudOff, Copy, LayoutTemplate, Plus, Share2, Trash2, Upload } from 'lucide-react-native';
import React, { useState } from 'react';

// This is the "what to install on a fresh cloud GPU" content library — kept
// off Settings on purpose. A template is something you author and reuse, not
// account config, and living here means "launch cloud GPU" and "manage what
// it launches" are one tap apart instead of templates being three levels
// deep under Settings → Cloud GPU.
export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { templates, removeTemplate, duplicateTemplate, addTemplate } = useTemplateStore();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // A file rather than a paste box: a template with an embedded workflow runs
  // to tens of kilobytes, which is not something anyone is going to paste on a
  // phone.
  const handleImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'public.json', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      const text = new File(result.assets[0].uri).textSync();
      addTemplate(parseTemplateFile(text));
      showToast.success('Imported', 'Template added', insets.top + 8);
    } catch (error) {
      showToast.error(
        'Import failed',
        error instanceof Error ? error.message : 'Could not read that file',
        insets.top + 8,
      );
    }
  };

  const handleExport = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    try {
      const safeName = template.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = new File(Paths.cache, `${safeName}.comfyportal-template.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(exportTemplate(template));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    } catch (error) {
      showToast.error(
        'Export failed',
        error instanceof Error ? error.message : 'Could not write the file',
        insets.top + 8,
      );
    }
  };

  const pendingName = templates.find((t) => t.id === pendingDelete)?.name ?? '';

  if (!CLOUD_GPU_SUPPORTED) {
    return (
      <View className="bg-surface-base flex-1">
        <AppBar title="Templates" titleSize="xl" />
        <EmptyState icon={CloudOff}>{CLOUD_GPU_UNSUPPORTED_REASON}</EmptyState>
      </View>
    );
  }

  return (
    <View className="bg-surface-base flex-1">
      <AppBar title="Templates" titleSize="xl" />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="sm">
          <Text className="text-sm text-content-secondary">
            What to install on a fresh cloud GPU — models, custom nodes and workflows, bundled together.
          </Text>

          <HStack space="sm" className="mt-1">
            <Button variant="outline" onPress={() => router.push('/templates/new')} className="flex-1 rounded-xl">
              <HStack space="xs" className="items-center">
                <Icon as={Plus} size="sm" className="text-action" />
                <ButtonText className="text-action">New</ButtonText>
              </HStack>
            </Button>
            <Button variant="outline" onPress={handleImport} className="flex-1 rounded-xl">
              <HStack space="xs" className="items-center">
                <Icon as={Upload} size="sm" className="text-action" />
                <ButtonText className="text-action">Import</ButtonText>
              </HStack>
            </Button>
          </HStack>

          {templates.length === 0 ? (
            <EmptyState icon={LayoutTemplate}>
              A template lists the models, extensions and workflows to install on a fresh instance.
            </EmptyState>
          ) : (
            templates.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => router.push(`/templates/${template.id}`)}
                className="rounded-xl bg-surface-raised p-4 active:opacity-80"
              >
                <HStack className="items-start justify-between">
                  <VStack className="flex-1" space="xs">
                    <Text className="text-base font-medium text-content-heading" numberOfLines={1}>
                      {template.name}
                    </Text>
                    <Text className="text-xs text-content-tertiary">
                      {template.models.length} model{template.models.length === 1 ? '' : 's'} ·{' '}
                      {template.extensions.length} extension
                      {template.extensions.length === 1 ? '' : 's'} · {template.workflows.length} workflow
                      {template.workflows.length === 1 ? '' : 's'}
                      {template.ollamaModels?.length ? ' · Ollama' : ''}
                    </Text>
                    <Text className="text-xs text-content-tertiary">
                      {template.gpuQuery || 'Any GPU'} · {estimateDiskGb(template.models)} GB disk
                    </Text>
                  </VStack>

                  <HStack space="xs" className="items-center">
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        void handleExport(template.id);
                      }}
                      className="p-2"
                    >
                      <Icon as={Share2} size="xs" className="text-content-tertiary" />
                    </Pressable>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        duplicateTemplate(template.id);
                      }}
                      className="p-2"
                    >
                      <Icon as={Copy} size="xs" className="text-content-tertiary" />
                    </Pressable>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setPendingDelete(template.id);
                      }}
                      className="p-2"
                    >
                      <Icon as={Trash2} size="xs" className="text-error-400" />
                    </Pressable>
                    <Icon as={ChevronRight} size="sm" className="text-content-tertiary" />
                  </HStack>
                </HStack>
              </Pressable>
            ))
          )}
        </VStack>
      </ScrollView>

      <DeleteAlert
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeTemplate(pendingDelete);
          setPendingDelete(null);
        }}
        title="Delete Template"
        description={`Delete "${pendingName}"? Instances already launched from it are unaffected.`}
      />
    </View>
  );
}
