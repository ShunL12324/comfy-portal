import { AdaptiveTextInput } from '@/components/self-ui/adaptive-sheet-components';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Search } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

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
  const debounceTimeout = useRef<NodeJS.Timeout>(undefined);
  const colors = useThemeColor();

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
      <Text className="px-4 pb-2 pt-4 text-lg font-medium text-primary-500">
        {title}
      </Text>

      {showSearch && (
        <Box className="px-4 pb-4">
          <HStack space="sm" className="items-center">
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background[200],
                borderRadius: 8,
                paddingHorizontal: 12,
                height: 40,
              }}
            >
              <Icon as={Search} size="sm" className="mr-2 text-background-400" />
              <AdaptiveTextInput
                placeholder={searchPlaceholder}
                value={localValue}
                onChangeText={handleChange}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: colors.primary[500],
                }}
                placeholderTextColor={colors.typography[400]}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
            {rightElement}
          </HStack>
        </Box>
      )}
    </VStack>
  );
}
