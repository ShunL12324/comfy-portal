import React, { useCallback, useMemo, useState, forwardRef } from 'react';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetHandle,
} from '@gorhom/bottom-sheet';
import { SearchableBottomSheetProps, SelectorOption } from '../types';
import { SearchHeader } from './search-header';
import { Item } from './item';
import { ListRenderItem, View } from 'react-native';
import { useThemeStore } from '@/store/theme';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { RefreshCw } from 'lucide-react-native';
import { Spinner } from '@/components/ui/spinner';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';

export const SearchableBottomSheet = forwardRef<
  BottomSheetModal,
  SearchableBottomSheetProps
>(function SearchableBottomSheet(
  {
    isVisible,
    onClose,
    onSelect,
    title,
    options,
    value,
    searchPlaceholder,
    showSearch = true,
    showRefreshButton = false,
    onRefresh,
    isRefreshing = false,
    renderTrigger,
    renderItem,
    numColumns = 1,
  },
  ref,
) {
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useThemeStore((state) => state.theme);

  // Get background color based on theme
  const backgroundColor =
    theme === 'dark' ? 'rgb(18, 18, 18)' : 'rgb(255, 255, 255)';

  const filteredOptions = useMemo(
    () =>
      showSearch
        ? options.filter((option) =>
            option.label
              .toLowerCase()
              .includes(searchQuery.trim().toLowerCase()),
          )
        : options,
    [options, searchQuery, showSearch],
  );

  const defaultRenderItem: ListRenderItem<SelectorOption> = useCallback(
    ({ item }) => (
      <Item item={item} isSelected={item.value === value} onSelect={onSelect} />
    ),
    [value, onSelect],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  );

  const renderHandle = useCallback(
    () => (
      <View
        style={{ backgroundColor }}
        className="-mb-1 h-8 items-center justify-center rounded-t-[24px]"
      >
        <View className="h-1 w-12 rounded-full bg-background-300" />
      </View>
    ),
    [backgroundColor],
  );

  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      {renderTrigger?.(selectedOption)}
      <BottomSheetModal
        ref={ref}
        snapPoints={['85%']}
        index={isVisible ? 0 : -1}
        enablePanDownToClose
        onDismiss={onClose}
        backdropComponent={renderBackdrop}
        handleComponent={renderHandle}
        backgroundStyle={{
          backgroundColor,
        }}
      >
        <SearchHeader
          title={title}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={searchPlaceholder}
          showSearch={showSearch}
          rightElement={
            showRefreshButton && (
              <Button
                variant="outline"
                size="md"
                onPress={onRefresh}
                className="aspect-square rounded-lg border-0 bg-background-50 p-0"
              >
                {isRefreshing ? (
                  <Spinner size="small" className="text-background-400" />
                ) : (
                  <Icon
                    as={RefreshCw}
                    size="sm"
                    className="text-background-400"
                  />
                )}
              </Button>
            )
          }
        />
        <BottomSheetFlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value}
          renderItem={
            renderItem
              ? ({ item }) =>
                  React.createElement(
                    React.Fragment,
                    null,
                    renderItem(item, item.value === value),
                  )
              : defaultRenderItem
          }
          numColumns={numColumns}
          columnWrapperStyle={
            numColumns > 1 ? { gap: 8, paddingHorizontal: 16 } : undefined
          }
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 34,
            gap: numColumns > 1 ? 16 : undefined,
          }}
        />
      </BottomSheetModal>
    </>
  );
});
