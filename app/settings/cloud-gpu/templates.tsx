import { AppBar } from '@/components/layout/app-bar';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useTemplateStore } from '@/features/cloud/stores/template-store';
import { estimateDiskGb } from '@/features/cloud/types';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { useRouter } from 'expo-router';
import { ChevronRight, Copy, LayoutTemplate, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';

export default function TemplatesScreen() {
  const router = useRouter();
  const { templates, removeTemplate, duplicateTemplate } = useTemplateStore();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const pendingName = templates.find((t) => t.id === pendingDelete)?.name ?? '';

  return (
    <View className="bg-background-0 flex-1">
      <AppBar title="Templates" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="sm">
          <Button
            variant="outline"
            onPress={() => router.push('/settings/cloud-gpu/template/new')}
            className="rounded-xl"
          >
            <HStack space="xs" className="items-center">
              <Icon as={Plus} size="sm" className="text-primary-500" />
              <ButtonText className="text-primary-500">New Template</ButtonText>
            </HStack>
          </Button>

          {templates.length === 0 ? (
            <VStack space="md" className="px-6 py-12 items-center">
              <Icon as={LayoutTemplate} className="h-8 w-8 text-typography-300" />
              <Text className="text-sm text-typography-400 text-center">
                A template lists the models, extensions and workflows to install on a fresh instance.
              </Text>
            </VStack>
          ) : (
            templates.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => router.push(`/settings/cloud-gpu/template/${template.id}`)}
                className="rounded-xl bg-background-50 p-4 active:opacity-80"
              >
                <HStack className="items-start justify-between">
                  <VStack className="flex-1" space="xs">
                    <Text className="text-base font-medium text-typography-900" numberOfLines={1}>
                      {template.name}
                    </Text>
                    <Text className="text-xs text-typography-400">
                      {template.models.length} model{template.models.length === 1 ? '' : 's'} ·{' '}
                      {template.extensions.length} extension
                      {template.extensions.length === 1 ? '' : 's'} · {template.workflows.length} workflow
                      {template.workflows.length === 1 ? '' : 's'}
                    </Text>
                    <Text className="text-xs text-typography-400">
                      {template.gpuQuery || 'Any GPU'} · {estimateDiskGb(template.models)} GB disk
                    </Text>
                  </VStack>

                  <HStack space="xs" className="items-center">
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        duplicateTemplate(template.id);
                      }}
                      className="p-2"
                    >
                      <Icon as={Copy} size="xs" className="text-typography-400" />
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
                    <Icon as={ChevronRight} size="sm" className="text-typography-400" />
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
