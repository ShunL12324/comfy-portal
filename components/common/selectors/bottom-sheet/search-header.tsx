import React, { useState, useCallback, useRef } from 'react';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Search } from 'lucide-react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';

interface SearchHeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  rightElement?: React.ReactNode;
}

export function SearchHeader({
  title,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  rightElement,
}: SearchHeaderProps) {
  const [localValue, setLocalValue] = useState(searchQuery);
  const debounceTimeout = useRef<NodeJS.Timeout>();

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        onSearchChange(text);
      }, 300);
    },
    [onSearchChange],
  );

  return (
    <VStack space="md">
      <Text className="pb-2 pt-4 text-lg font-medium text-primary-500" style={{ paddingHorizontal: 16 }}>
        {title}
      </Text>

      {showSearch && (
        <Box className="pb-4" style={{ paddingHorizontal: 16 }}>
          <HStack space="sm" className="items-center">
            <Box className="flex-1">
              <Input variant="outline" size="md" className="overflow-hidden rounded-lg border-0 bg-background-50">
                <InputSlot className="pl-3">
                  <InputIcon as={Search} className="text-background-400" />
                </InputSlot>
                <InputField
                  placeholder={searchPlaceholder}
                  value={localValue}
                  onChangeText={handleChange}
                  className="text-base text-primary-500"
                  placeholderTextColor="rgb(115, 115, 115)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </Input>
            </Box>
            {rightElement}
          </HStack>
        </Box>
      )}
    </VStack>
  );
}
