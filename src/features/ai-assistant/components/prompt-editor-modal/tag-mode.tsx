import { Action, Copy } from '@/components/ui/design-system/primitives';
import { Input, InputField } from '@/components/ui/input';
import { View } from '@/components/ui/view';
import { generateUUID } from '@/utils/uuid';
import { ArrowDown, ArrowUp, Check, Minus, Plus, Trash2 } from '@/constants/icons';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

interface Tag {
  id: string;
  text: string;
  strength: number;
}

interface TagModeProps {
  value: string;
  onChange: (value: string) => void;
}

const extractTagStrength = (tag: string) => {
  const match = tag.match(/^\((.*?):(\d+(?:\.\d+)?)\)$/);
  if (match) {
    return parseFloat(match[2]);
  }
  return 1;
};

const parsePromptToTags = (prompt: string): Tag[] => {
  if (typeof prompt !== 'string') return [];
  return prompt
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => {
      const match = tag.match(/^\((.*?):(\d+(?:\.\d+)?)\)$/);
      return {
        id: generateUUID(),
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

interface TagItemProps {
  tag: string;
  strength: number;
  selected: boolean;
  onSelect: () => void;
}

function TagItem({ tag, strength, selected, onSelect }: TagItemProps) {
  return (
    <View
      className={`h-8 px-2 flex-row items-center rounded-full border ${
        selected ? 'border-ink bg-surface-muted' : 'bg-surface-raised border-transparent'
      }`}
    >
      <Pressable onPress={onSelect} className="max-w-[90%] flex-row items-center">
        <Copy size="label" className="px-2 py-1 text-ellipsis">
          {tag}
        </Copy>
        <Copy size="metadata" style={{ fontWeight: '600' }}>
          {strength.toFixed(1)}
        </Copy>
      </Pressable>
    </View>
  );
}

export function TagMode({ value, onChange }: TagModeProps) {
  const [tags, setTags] = useState<Tag[]>(() => parsePromptToTags(value));
  const [newTag, setNewTag] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // Re-parse only when the value changes from outside; our own edits round-trip
  // to the same prompt, so tag ids and selection survive them.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== formatTagsToPrompt(tags)) setTags(parsePromptToTags(value));
  }

  // Every edit happens in an event handler, which reports the new prompt directly.
  const commitTags = (next: Tag[]) => {
    setTags(next);
    onChange(formatTagsToPrompt(next));
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
      commitTags(updatedTags);
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
      id: generateUUID(),
      text: newTag.trim(),
      strength: 1,
    };

    const updatedTags = [...tags, newTagObj];
    commitTags(updatedTags);
    setNewTag('');
  };

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = tags.filter((tag) => tag.id !== tagId);
    commitTags(updatedTags);
  };

  const handleUpdateTagStrength = (tagId: string, newStrength: number) => {
    const updatedTags = tags.map((tag) =>
      tag.id === tagId
        ? {
            ...tag,
            strength: Number(newStrength.toFixed(1)),
          }
        : tag,
    );
    commitTags(updatedTags);
  };

  const handleIncreaseStrength = () => {
    if (selectedTagId) {
      const tag = tags.find((t) => t.id === selectedTagId);
      if (tag) {
        const newStrength = Math.min(2.5, tag.strength + 0.1);
        handleUpdateTagStrength(selectedTagId, newStrength);
      }
    }
  };

  const handleDecreaseStrength = () => {
    if (selectedTagId) {
      const tag = tags.find((t) => t.id === selectedTagId);
      if (tag) {
        const newStrength = Math.max(0.1, tag.strength - 0.1);
        handleUpdateTagStrength(selectedTagId, newStrength);
      }
    }
  };

  const handleRemoveSelectedTag = () => {
    if (selectedTagId) {
      handleRemoveTag(selectedTagId);
      setSelectedTagId(null);
      setNewTag('');
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
        commitTags(updatedTags);
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
        commitTags(updatedTags);
      }
    }
  };

  return (
    <View className="flex-1">
      <Copy size="label" muted className="mb-3" style={{ fontWeight: '500' }}>
        Tags
      </Copy>

      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 200 }}
      >
        <View className="mb-4 gap-2 flex-row flex-wrap">
          {tags.length === 0 ? (
            <Copy size="label" muted>
              No tags yet. Add one below.
            </Copy>
          ) : (
            tags.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag.text}
                strength={tag.strength}
                selected={selectedTagId === tag.id}
                onSelect={() => handleTagSelect(tag.id)}
              />
            ))
          )}
        </View>
      </MotiView>

      {/* Control buttons */}
      <MotiView
        from={{ opacity: 0, translateX: 20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 200 }}
      >
        <View className="mb-4 gap-2 flex-row items-center justify-between">
          <Action
            small
            kind="secondary"
            icon={ArrowUp}
            label="Move tag up"
            disabled={selectedTagId === null}
            onPress={handleMoveTagUp}
          />
          <Action
            small
            kind="secondary"
            icon={ArrowDown}
            label="Move tag down"
            disabled={selectedTagId === null}
            onPress={handleMoveTagDown}
          />
          <Action
            small
            kind="secondary"
            icon={Plus}
            label="Increase tag strength"
            disabled={selectedTagId === null}
            onPress={handleIncreaseStrength}
          >
            Stronger
          </Action>
          <Action
            small
            kind="secondary"
            icon={Minus}
            label="Decrease tag strength"
            disabled={selectedTagId === null}
            onPress={handleDecreaseStrength}
          >
            Weaker
          </Action>
          <Action
            kind="secondary"
            destructive
            icon={Trash2}
            label="Remove tag"
            disabled={selectedTagId === null}
            onPress={handleRemoveSelectedTag}
          />
        </View>
      </MotiView>

      {/* Add/Edit input */}
      <Animated.View
        className="gap-2 flex-row items-center"
        layout={LinearTransition.springify().damping(10).stiffness(100).duration(100)}
      >
        <Input className="rounded-md bg-surface-sunken flex-1 border-0">
          <InputField
            placeholder={selectedTagId ? 'Edit tag' : 'Add a tag'}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={handleAddTag}
            className="rounded-md"
          />
        </Input>
        <MotiView animate={{ width: selectedTagId ? 100 : 80 }} transition={{ type: 'timing', duration: 200 }}>
          <Action kind="primary" icon={selectedTagId ? Check : Plus} onPress={handleAddTag} fill>
            {selectedTagId ? 'Confirm' : 'Add'}
          </Action>
        </MotiView>
      </Animated.View>
    </View>
  );
}
