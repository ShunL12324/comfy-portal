import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Action, ActionRow, Copy, Field, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Sheet } from '@/components/ui/design-system/overlays';
import { FileJson, Clipboard as ClipboardIcon, History, ImagePlus, ChevronRight, X } from '@/constants/icons';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '../stores/workflow-store';
import { parseWorkflowTemplate } from '../utils/workflow-parser';
import type { Workflow, WorkflowAsset, WorkflowRecord } from '../types';
import { saveWorkflowThumbnail } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

/** A workflow read from a file or the clipboard, reviewed and named, ready to add. */
export interface WorkflowDraft {
  name: string;
  data: Workflow;
  method: WorkflowRecord['addMethod'];
  /** Optional preview image chosen during review. */
  thumbnail?: string;
}

interface AddWorkflowSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Where the workflow goes, shown as "Into …" under the title. */
  destination?: string;
  /** Offer a preview image during review; off where the destination keeps none. */
  previewImage?: boolean;
  /** Adds a reviewed workflow. Throws on failure; `previewFailed` reports a lost preview image. */
  onAdd: (draft: WorkflowDraft) => Promise<{ previewFailed?: boolean } | void>;
  /** Adds the workflows picked from history. */
  onAddFromHistory: (assets: WorkflowAsset[]) => void;
}

/**
 * The one Add workflow flow: from a file, from the clipboard, or from history
 * (every workflow this device has kept). Servers and environments both use it;
 * only where the result lands differs.
 */
export function AddWorkflowSheet(props: AddWorkflowSheetProps) {
  return props.isOpen ? <AddWorkflowFlow {...props} /> : null;
}

/** Add workflow into a server's list. */
export function ImportWorkflowModal({
  isOpen,
  onClose,
  serverId,
}: {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}) {
  const serverName = useServersStore((state) => state.servers.find((server) => server.id === serverId)?.name);
  const onAdd = async ({ name, data, method, thumbnail }: WorkflowDraft) => {
    const store = useWorkflowStore.getState();
    const id = store.addWorkflow({ serverId, name, data, addMethod: method });
    if (!thumbnail) return;
    try {
      const saved = await saveWorkflowThumbnail({ serverId, workflowId: id, imageUri: thumbnail });
      if (saved) store.updateWorkflow(id, { thumbnail: saved.path });
      else return { previewFailed: true };
    } catch {
      return { previewFailed: true };
    }
  };
  const onAddFromHistory = (assets: WorkflowAsset[]) => {
    const store = useWorkflowStore.getState();
    for (const asset of assets) store.importAsset(asset.id, serverId);
  };
  return (
    <AddWorkflowSheet
      isOpen={isOpen}
      onClose={onClose}
      destination={serverName}
      onAdd={onAdd}
      onAddFromHistory={onAddFromHistory}
    />
  );
}

function AddWorkflowFlow({
  isOpen,
  onClose,
  destination,
  previewImage = true,
  onAdd,
  onAddFromHistory,
}: AddWorkflowSheetProps) {
  const c = useDesign();
  const assets = useWorkflowStore((state) => state.assets);
  const [step, setStep] = useState<'source' | 'configure' | 'library'>('source');
  const [name, setName] = useState('');
  const [data, setData] = useState<Workflow>();
  const [method, setMethod] = useState<WorkflowRecord['addMethod']>('file');
  const [thumbnail, setThumbnail] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const parse = (text: string, source: WorkflowRecord['addMethod'], title: string) => {
    const workflow = parseWorkflowTemplate(JSON.parse(text));
    if (!Object.keys(workflow).length) throw new Error('Workflow has no nodes.');
    setData(workflow);
    setName(title);
    setMethod(source);
    setStep('configure');
    showToast.success('Workflow loaded', 'Review it before adding.');
  };
  const readFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
      parse(text, 'file', asset.name.replace(/\.json$/i, ''));
    } catch {
      showToast.error('Could not load workflow', 'Choose a valid ComfyUI workflow JSON file.');
    }
  };
  const paste = async () => {
    let text: string;
    try {
      text = await Clipboard.getStringAsync();
    } catch {
      showToast.error('Could not read clipboard', 'Allow clipboard access and try again.');
      return;
    }
    if (!text.trim()) {
      showToast.error('Clipboard is empty', 'Copy a ComfyUI workflow JSON first.');
      return;
    }
    try {
      parse(text, 'clipboard', 'Imported workflow');
    } catch {
      showToast.error('Could not load workflow', 'The clipboard does not contain valid ComfyUI workflow JSON.');
    }
  };
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: Platform.OS === 'web',
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setThumbnail(asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri);
    }
  };
  const save = async () => {
    if (busy || !data || !name.trim()) return;
    setBusy(true);
    try {
      const result = await onAdd({ name: name.trim(), data, method, thumbnail: thumbnail || undefined });
      onClose();
      if (result?.previewFailed) showToast.info('Workflow added', 'Preview image could not be saved.');
      else showToast.success('Workflow added');
    } catch {
      showToast.error('Could not add workflow', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const importSelected = () => {
    onAddFromHistory(assets.filter((asset) => selected.includes(asset.id)));
    showToast.success(`${selected.length} workflow${selected.length === 1 ? '' : 's'} added`);
    onClose();
  };
  return (
    <Sheet
      open={isOpen}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={step === 'library' ? 'History workflows' : 'Add workflow'}
      onBack={step === 'library' ? () => setStep('source') : undefined}
    >
      {step !== 'library' && !!destination && (
        <Copy muted size="label">
          Into {destination}
        </Copy>
      )}
      {step === 'source' && (
        <>
          {[
            {
              title: 'From a file',
              subtitle: 'Choose a workflow JSON file',
              icon: FileJson,
              onPress: readFile,
              label: 'Choose JSON file',
            },
            {
              title: 'From Clipboard',
              subtitle: 'Paste copied workflow JSON',
              icon: ClipboardIcon,
              onPress: paste,
              label: 'Paste from clipboard',
            },
            ...(assets.length
              ? [
                  {
                    title: 'From History',
                    subtitle: 'Choose workflows you have added or run before',
                    icon: History,
                    onPress: () => setStep('library'),
                    label: 'From history workflows',
                  },
                ]
              : []),
          ].map(({ title, subtitle, icon: Icon, onPress, label }) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onPress}
              style={{
                minHeight: 64,
                padding: t.layout.field,
                gap: t.layout.field,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.card,
                borderRadius: t.radius.panel,
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
                <Icon size={t.icon.large} strokeWidth={iconStroke(t.icon.large)} color={c.ink} />
              </View>
              <View style={{ flex: 1, gap: t.layout.label }}>
                <Copy>{title}</Copy>
                <Copy muted size="metadata">
                  {subtitle}
                </Copy>
              </View>
              <ChevronRight size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={c.muted} />
            </Pressable>
          ))}
          <Action kind="secondary" fill onPress={onClose}>
            Cancel
          </Action>
        </>
      )}
      {step === 'configure' && data && (
        <>
          <Field label="Workflow name" value={name} onChange={setName} placeholder="Workflow name" />
          <Row style={{ alignItems: 'flex-start', gap: t.layout.field }}>
            {previewImage && (
              <View style={{ width: 112, gap: t.layout.related }}>
                <Copy size="label">Preview image</Copy>
                <View style={{ width: 112, height: 112 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose preview image"
                    onPress={pickImage}
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: t.radius.control,
                      overflow: 'hidden',
                      backgroundColor: c.well,
                      borderWidth: thumbnail ? 0 : 1,
                      borderStyle: 'dashed',
                      borderColor: c.faint,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: t.layout.related,
                    }}
                  >
                    {thumbnail ? (
                      <Image source={{ uri: thumbnail }} style={{ width: 112, height: 112 }} contentFit="cover" />
                    ) : (
                      <>
                        <ImagePlus size={t.icon.hero} strokeWidth={iconStroke(t.icon.hero)} color={c.ink} />
                        <Copy muted size="metadata">
                          Add image
                        </Copy>
                        <Copy muted size="micro">
                          Optional
                        </Copy>
                      </>
                    )}
                  </Pressable>
                  {!!thumbnail && (
                    <View style={{ position: 'absolute', top: 0, right: 0 }}>
                      <Action kind="tonal" icon={X} label="Remove preview image" onPress={() => setThumbnail('')} />
                    </View>
                  )}
                </View>
              </View>
            )}
            <View style={{ flex: 1, gap: t.layout.related }}>
              <Copy size="label">Nodes · {Object.keys(data).length}</Copy>
              {/* Plain RN ScrollView: Gorhom tracks one scrollable per sheet, so a nested sheet scrollable would take over the sheet's own. */}
              <ScrollView
                style={{ height: 112, borderRadius: t.radius.control, backgroundColor: c.card }}
                nestedScrollEnabled
                contentContainerStyle={{ gap: t.layout.label, padding: t.layout.related }}
              >
                {Object.entries(data).map(([id, node]) => (
                  <Row key={id} style={{ minHeight: t.height.small, gap: t.layout.related }}>
                    <Copy mono muted size="micro">
                      {id.padStart(2, '0')}
                    </Copy>
                    <Copy size="metadata" numberOfLines={1} style={{ flex: 1 }}>
                      {node._meta?.title || node.class_type}
                    </Copy>
                  </Row>
                ))}
              </ScrollView>
            </View>
          </Row>
          <ActionRow>
            <Action kind="secondary" fill disabled={busy} onPress={onClose}>
              Cancel
            </Action>
            <Action kind="primary" fill disabled={!name.trim()} loading={busy} onPress={save}>
              Add workflow
            </Action>
          </ActionRow>
        </>
      )}
      {step === 'library' && (
        <>
          <Field
            label="Search history workflows"
            search
            value={query}
            onChange={setQuery}
            placeholder="Search workflows"
          />
          {assets
            .filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase()))
            .map((asset) => {
              const active = selected.includes(asset.id);
              return (
                <Pressable
                  key={asset.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() =>
                    setSelected((ids) => (active ? ids.filter((id) => id !== asset.id) : [...ids, asset.id]))
                  }
                  style={{
                    minHeight: 64,
                    borderRadius: t.radius.panel,
                    backgroundColor: active ? c.raised : c.card,
                    borderWidth: 1,
                    borderColor: active ? c.ink : 'transparent',
                    padding: t.layout.field,
                    gap: t.layout.label,
                  }}
                >
                  <Copy>{asset.name}</Copy>
                  <Copy size="metadata" style={{ color: c.secondary }}>
                    {Object.keys(asset.data).length} nodes
                  </Copy>
                </Pressable>
              );
            })}
          {!assets.length && <Copy muted>No history workflows yet.</Copy>}
          <Action kind="primary" disabled={!selected.length} onPress={importSelected}>
            Add selected ({selected.length})
          </Action>
        </>
      )}
    </Sheet>
  );
}
