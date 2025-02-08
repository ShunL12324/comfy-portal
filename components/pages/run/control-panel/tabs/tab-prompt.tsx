import Switch from '@/components/self-ui/switch';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { usePresetsStore } from '@/store/presets';
import { Tag } from '@/types/preset';
import * as Crypto from 'expo-crypto';
import { ArrowDown, ArrowUp, Check, Minus, Plus, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { TabItem, TagItem } from './common';

interface TabPromptProps {
  serverId: string;
  presetId: string;
}

const extractTagStrength = (tag: string) => {
  const match = tag.match(/^\((.*?):(\d+(?:\.\d+)?)\)$/);
  if (match) {
    return parseFloat(match[2]);
  }
  return 1;
};

const parsePromptToTags = (prompt: string): Tag[] => {
  return prompt
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => {
      const match = tag.match(/^\((.*?):(\d+(?:\.\d+)?)\)$/);
      return {
        id: Crypto.randomUUID(),
        text: match ? match[1] : tag,
        strength: extractTagStrength(tag),
      };
    });
};

const formatTagsToPrompt = (tags: Tag[]): string => {
  return tags
    .map((tag) => {
      if (tag.strength === 1) return tag.text;
      return `(${tag.text}:${tag.strength})`;
    })
    .join(', ');
};

interface PromptInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  title: string;
}

function PromptInput({ value, onChangeValue, title }: PromptInputProps) {
  const [tagMode, setTagMode] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>(() => parsePromptToTags(value));

  const handleTagModeChange = (newValue: boolean) => {
    setTagMode(newValue);
    if (newValue) {
      setTags(parsePromptToTags(value));
    }
    setSelectedTagId(null);
    setNewTag('');
  };

  const handleTagSelect = (tagId: string) => {
    if (selectedTagId === tagId) {
      setSelectedTagId(null);
      setNewTag('');
    } else {
      const selectedTag = tags.find((t) => t.id === tagId);
      setSelectedTagId(tagId);
      if (selectedTag) {
        setNewTag(selectedTag.text);
      }
    }
  };

  const handleConfirmEdit = () => {
    if (selectedTagId && newTag.trim()) {
      const updatedTags = tags.map((tag) =>
        tag.id === selectedTagId
          ? {
              ...tag,
              text: newTag.trim(),
            }
          : tag,
      );
      setTags(updatedTags);
      onChangeValue(formatTagsToPrompt(updatedTags));
      setSelectedTagId(null);
      setNewTag('');
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    if (selectedTagId) {
      handleConfirmEdit();
      return;
    }

    const newTagObj: Tag = {
      id: Crypto.randomUUID(),
      text: newTag.trim(),
      strength: 1,
    };

    const updatedTags = [...tags, newTagObj];
    setTags(updatedTags);
    onChangeValue(formatTagsToPrompt(updatedTags));
    setNewTag('');
  };

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = tags.filter((tag) => tag.id !== tagId);
    setTags(updatedTags);
    onChangeValue(formatTagsToPrompt(updatedTags));
  };

  const handleUpdateTagStrength = (tagId: string, newStrength: number) => {
    const updatedTags = tags.map((tag) =>
      tag.id === tagId
        ? {
            ...tag,
            strength: Number(Math.max(0.1, Math.min(2.5, newStrength)).toFixed(1)),
          }
        : tag,
    );
    setTags(updatedTags);
    onChangeValue(formatTagsToPrompt(updatedTags));
  };

  const handleIncreaseStrength = () => {
    if (selectedTagId) {
      const tag = tags.find((t) => t.id === selectedTagId);
      if (tag) {
        handleUpdateTagStrength(selectedTagId, tag.strength + 0.1);
      }
    }
  };

  const handleDecreaseStrength = () => {
    if (selectedTagId) {
      const tag = tags.find((t) => t.id === selectedTagId);
      if (tag) {
        handleUpdateTagStrength(selectedTagId, tag.strength - 0.1);
      }
    }
  };

  const handleRemoveSelectedTag = () => {
    if (selectedTagId) {
      handleRemoveTag(selectedTagId);
      setSelectedTagId(null);
    }
  };

  const handleMoveTagUp = () => {
    if (selectedTagId) {
      const currentIndex = tags.findIndex((t) => t.id === selectedTagId);
      if (currentIndex > 0) {
        const updatedTags = [...tags];
        [updatedTags[currentIndex - 1], updatedTags[currentIndex]] = [
          updatedTags[currentIndex],
          updatedTags[currentIndex - 1],
        ];
        setTags(updatedTags);
        onChangeValue(formatTagsToPrompt(updatedTags));
      }
    }
  };

  const handleMoveTagDown = () => {
    if (selectedTagId) {
      const currentIndex = tags.findIndex((t) => t.id === selectedTagId);
      if (currentIndex < tags.length - 1) {
        const updatedTags = [...tags];
        [updatedTags[currentIndex], updatedTags[currentIndex + 1]] = [
          updatedTags[currentIndex + 1],
          updatedTags[currentIndex],
        ];
        setTags(updatedTags);
        onChangeValue(formatTagsToPrompt(updatedTags));
      }
    }
  };

  return (
    <TabItem
      title={title}
      titleRight={
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-typography-500">Plain</Text>
          <Switch size="sm" disabled={false} value={tagMode} onValueChange={handleTagModeChange} />
          <Text className="text-sm text-typography-500">Tag</Text>
        </View>
      }
    >
      {!tagMode ? (
        <Textarea
          size="sm"
          isReadOnly={false}
          isInvalid={false}
          isDisabled={false}
          className="w-full rounded-md border-0 bg-background-100"
        >
          <TextareaInput placeholder={`${title} goes here...`} value={value} onChangeText={onChangeValue} />
        </Textarea>
      ) : (
        <View className="flex-col gap-4">
          <View className="flex-row flex-wrap gap-2">
            {tags.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag.text}
                strength={tag.strength}
                selected={selectedTagId === tag.id}
                onSelect={() => handleTagSelect(tag.id)}
              />
            ))}
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <Button
              size="sm"
              variant="solid"
              action="primary"
              disabled={selectedTagId === null}
              className={`${selectedTagId === null ? 'opacity-60' : ''}`}
              onPress={handleIncreaseStrength}
            >
              <ButtonIcon as={Plus} />
              <ButtonText>Increase</ButtonText>
            </Button>
            <Button
              size="sm"
              variant="solid"
              action="primary"
              disabled={selectedTagId === null}
              className={`${selectedTagId === null ? 'opacity-60' : ''}`}
              onPress={handleDecreaseStrength}
            >
              <ButtonIcon as={Minus} />
              <ButtonText>Decrease</ButtonText>
            </Button>
            <Button
              size="sm"
              variant="solid"
              action="primary"
              disabled={selectedTagId === null}
              className={`${selectedTagId === null ? 'opacity-60' : ''}`}
              onPress={handleMoveTagUp}
            >
              <ButtonIcon as={ArrowUp} />
            </Button>
            <Button
              size="sm"
              variant="solid"
              action="primary"
              disabled={selectedTagId === null}
              className={`${selectedTagId === null ? 'opacity-60' : ''}`}
              onPress={handleMoveTagDown}
            >
              <ButtonIcon as={ArrowDown} />
            </Button>
            <TouchableOpacity
              className={`rounded-md border-[0.5px] border-error-500 p-2 ${selectedTagId === null ? 'opacity-60' : ''}`}
              disabled={selectedTagId === null}
              onPress={handleRemoveSelectedTag}
            >
              <Icon as={Trash2} size="sm" className="text-error-500" />
            </TouchableOpacity>
          </View>
          <Animated.View
            className="flex-row items-center gap-2"
            layout={LinearTransition.springify().damping(10).stiffness(100).duration(100)}
          >
            <Input className="flex-1 rounded-md border-0 bg-background-100">
              <InputField
                placeholder={selectedTagId ? 'Edit tag' : 'Add a tag'}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={handleAddTag}
                className="rounded-md text-sm"
              />
            </Input>
            <MotiView
              animate={{
                width: selectedTagId ? 100 : 80,
              }}
              transition={{
                type: 'timing',
                duration: 200,
              }}
            >
              <Button size="sm" variant="solid" action="primary" onPress={handleAddTag} className="w-full">
                <ButtonIcon as={selectedTagId ? Check : Plus} />
                <ButtonText>{selectedTagId ? 'Confirm' : 'Add'}</ButtonText>
              </Button>
            </MotiView>
          </Animated.View>
        </View>
      )}
    </TabItem>
  );
}

export default function TabPrompt({ serverId, presetId }: TabPromptProps) {
  // data
  const preset = usePresetsStore((state) => state.presets.find((p) => p.id === presetId));

  if (!preset) return null;

  // actions
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  return (
    <ScrollView
      className="flex-1 bg-background-0"
      contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 48 }}
      automaticallyAdjustKeyboardInsets
    >
      <PromptInput
        title="Positive Prompt"
        value={preset.params.positivePrompt}
        onChangeValue={(value) =>
          updatePreset(presetId, {
            params: { ...preset.params, positivePrompt: value },
          })
        }
      />
      <PromptInput
        title="Negative Prompt"
        value={preset.params.negativePrompt}
        onChangeValue={(value) =>
          updatePreset(presetId, {
            params: { ...preset.params, negativePrompt: value },
          })
        }
      />
    </ScrollView>
  );
}
