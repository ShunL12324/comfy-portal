import { Copy, useDesign } from '@/components/ui/design-system/primitives';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import { EditWorkflowModal } from '@/features/workflow/components/edit-workflow-modal';
import { useMediaStore } from '@/features/gallery/stores/media-store';
import { workflowUsageLabel } from '@/features/workflow/utils/workflow-usage';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useRouter } from 'expo-router';
import { GitBranch } from '@/constants/icons';
import { MotiView } from 'moti';
import { usePressFeedback } from '@/components/ui/design-system/press-feedback';
import { useState } from 'react';
import { workflowSourceNotice } from '../utils/workflow-source';
import { WorkflowSourceSheet } from './workflow-source-sheet';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
export function WorkflowCard({ id }: { id: string }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [failedImage, setFailedImage] = useState<string>();
  const record = useWorkflowStore((s) => s.workflow.find((w) => w.id === id));
  const generatedPreview = useMediaStore(
    (state) =>
      state.assets.find(
        (asset) => asset.kind === 'image' && asset.serverId === record?.serverId && asset.workflowId === id,
      )?.path,
  );
  const preview = record?.thumbnail || generatedPreview;
  const router = useRouter();
  const c = useDesign();
  const press = usePressFeedback();
  if (!record) return null;
  const notice = workflowSourceNotice(record);
  const origin = record.addMethod === 'server-sync' ? 'Server' : 'Imported';
  return (
    <>
      <MotiView animate={press.animate} transition={press.transition} style={{ position: 'relative' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${record.name}`}
          onLongPress={() => setEditing(true)}
          accessibilityHint={`${origin}. ${workflowUsageLabel(record.lastUsed)}. ${notice ?? ''}. Open workflow. Long press to manage.`}
          onPress={() => router.navigate(`/workflow/${record.serverId}/run/${id}`)}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <View
          pointerEvents="box-none"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.layout.field,
            paddingVertical: t.layout.rowY,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              width: t.height.touch,
              height: t.height.touch,
              flexShrink: 0,
              overflow: 'hidden',
              borderRadius: t.radius.small,
              backgroundColor: c.raised,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {preview && failedImage !== preview ? (
              <Image
                size="none"
                source={{ uri: preview }}
                alt={record.name}
                style={{ width: t.height.touch, height: t.height.touch }}
                onError={() => setFailedImage(preview)}
              />
            ) : (
              <GitBranch size={t.icon.large} strokeWidth={iconStroke(t.icon.large)} color={c.ink} />
            )}
          </View>
          <View pointerEvents="box-none" style={{ flex: 1, minWidth: 0, gap: t.layout.label }}>
            <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: t.layout.related }}>
              <Copy size="section" style={{ fontWeight: '500', flex: 1, minWidth: 0 }} numberOfLines={1}>
                {record.name}
              </Copy>
            </View>
            <View
              pointerEvents="box-none"
              style={{ flexDirection: 'row', alignItems: 'center', gap: t.layout.related }}
            >
              <View pointerEvents="none" style={{ flex: 1, minWidth: 0 }}>
                <Copy muted size="metadata" numberOfLines={1}>
                  {origin}
                  {record.lastUsed ? ` · ${workflowUsageLabel(record.lastUsed)}` : ''}
                </Copy>
              </View>
              {notice && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${notice}: ${record.name}`}
                  onPress={() => setSourceOpen(true)}
                  style={{
                    minHeight: t.height.touch,
                    justifyContent: 'center',
                    maxWidth: '55%',
                    flexShrink: 0,
                    marginVertical: -(t.height.touch - t.leading.metadata) / 2,
                  }}
                >
                  <Copy size="metadata" numberOfLines={1} style={{ color: c.ink }}>
                    {notice}
                  </Copy>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </MotiView>
      <WorkflowSourceSheet id={id} open={sourceOpen} onClose={() => setSourceOpen(false)} />
      <EditWorkflowModal isOpen={editing} onClose={() => setEditing(false)} workflowId={id} />
    </>
  );
}
