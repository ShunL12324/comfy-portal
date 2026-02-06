import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import * as Crypto from 'expo-crypto';
import { ArrowDown, ArrowUp, Check, Minus, Plus, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Pressable, TouchableOpacity } from 'react-native';
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

const getStrengthColor = (strength: number) => {
  if (strength <= 0.5) return 'text-success-400';
  if (strength <= 0.8) return 'text-success-500';
  if (strength <= 1.0) return 'text-success-600';
  if (strength <= 1.2) return 'text-warning-400';
  if (strength <= 1.5) return 'text-warning-500';
  if (strength <= 1.8) return 'text-error-400';
  if (strength <= 2.0) return 'text-error-500';
  if (strength <= 2.3) return 'text-error-600';
  return 'text-error-700';
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
      className={`h-8 flex-row items-center gap-[0.5px] rounded-full border px-2 ${
        selected ? 'border-primary-700 bg-background-200' : 'border-transparent bg-background-50'
      }`}
    >
      <Pressable onPress={onSelect} className="max-w-[90%] flex-row items-center">
        <Text size="sm" className="text-ellipsis px-2 py-1 text-typography-900">
          {tag}
        </Text>
        <Text size="sm" className={`${getStrengthColor(strength)} text-xs`} bold>
          {strength.toFixed(1)}
        </Text>
      </Pressable>
    </View>
  );
}

export function TagMode({ value, onChange }: TagModeProps) {
  const [tags, setTags] = useState<Tag[]>(() => parsePromptToTags(value));
  const [newTag, setNewTag] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // Sync tags to parent value
  useEffect(() => {
    const prompt = formatTagsToPrompt(tags);
    onChange(prompt);
  }, [tags, onChange]);

  // Re-parse tags when value changes externally
  useEffect(() => {
    const currentPrompt = formatTagsToPrompt(tags);
    if (value !== currentPrompt) {
      setTags(parsePromptToTags(value));
    }
  }, [value]);

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
    setNewTag('');
  };

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = tags.filter((tag) => tag.id !== tagId);
    setTags(updatedTags);
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
    setTags(updatedTags);
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
        setTags(updatedTags);
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
      }
    }
  };

  return (
    <View className="flex-1">
      <Text className="mb-3 text-sm font-medium text-typography-600">Tags</Text>

      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 200 }}
      >
        <View className="mb-4 flex-row flex-wrap gap-2">
          {tags.length === 0 ? (
            <Text className="text-sm text-typography-400">No tags yet. Add one below.</Text>
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
        <View className="mb-4 flex-row items-center justify-between gap-2">
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
          <Button
            size="sm"
            variant="solid"
            action="primary"
            disabled={selectedTagId === null}
            className={`${selectedTagId === null ? 'opacity-60' : ''}`}
            onPress={handleIncreaseStrength}
          >
            <ButtonIcon as={Plus} />
            <ButtonText>Stronger</ButtonText>
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
            <ButtonText>Weaker</ButtonText>
          </Button>
          <TouchableOpacity
            className={`rounded-md border-[0.5px] border-error-500 p-2 ${
              selectedTagId === null ? 'opacity-60' : ''
            }`}
            disabled={selectedTagId === null}
            onPress={handleRemoveSelectedTag}
          >
            <Icon as={Trash2} size="sm" className="text-error-500" />
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* Add/Edit input */}
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
          animate={{ width: selectedTagId ? 100 : 80 }}
          transition={{ type: 'timing', duration: 200 }}
        >
          <Button size="sm" variant="solid" action="primary" onPress={handleAddTag} className="w-full">
            <ButtonIcon as={selectedTagId ? Check : Plus} />
            <ButtonText>{selectedTagId ? 'Confirm' : 'Add'}</ButtonText>
          </Button>
        </MotiView>
      </Animated.View>
    </View>
  );
}
