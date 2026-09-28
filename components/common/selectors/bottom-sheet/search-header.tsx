import { Box } from '@/components/ui/box';
import { Title, Field } from '@/components/ui/design-system/primitives';
import React from 'react';
import { View } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';

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
  return (
    <View
      testID="selector-header"
      style={{
        paddingHorizontal: t.layout.inset,
        paddingTop: t.layout.related,
        paddingBottom: t.layout.inset,
        gap: t.layout.field,
        flexDirection: 'column',
      }}
    >
      <View testID="selector-title-row" style={{ flexDirection: 'row', alignItems: 'center', gap: t.layout.related }}>
        <Box className="flex-1">
          <Title compact numberOfLines={1}>
            {title}
          </Title>
        </Box>
        {rightElement}
      </View>

      {showSearch && (
        <View testID="selector-search">
          <Field
            search
            label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={onSearchChange}
          />
        </View>
      )}
    </View>
  );
}
