import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { RefreshCw } from 'lucide-react-native';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { ListRenderItem, View } from 'react-native';
import { SearchableBottomSheetProps, SelectorOption } from '../types';
import { Item } from './item';
import { SearchHeader } from './search-header';

export const SearchableBottomSheet = forwardRef<BottomSheetModal, SearchableBottomSheetProps>(
  function SearchableBottomSheet(
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

    const filteredOptions = useMemo(
      () =>
        showSearch
          ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
          : options,
      [options, searchQuery, showSearch],
    );

    const defaultRenderItem: ListRenderItem<SelectorOption> = useCallback(
      ({ item }) => <Item item={item} isSelected={item.value === value} onSelect={onSelect} />,
      [value, onSelect],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
      [],
    );

    const renderHandle = useCallback(
      () => (
        <View className="-mb-1 h-8 items-center justify-center rounded-t-[24px] bg-background-0">
          <View className="h-1 w-12 rounded-full bg-background-300" />
        </View>
      ),
      [],
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
            backgroundColor: theme === 'dark' ? Colors.dark.background[0] : Colors.light.background[0],
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
                    <Icon as={RefreshCw} size="sm" className="text-background-400" />
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
                ? ({ item }) => React.createElement(React.Fragment, null, renderItem(item, item.value === value))
                : defaultRenderItem
            }
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 8, paddingHorizontal: 16 } : undefined}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 34,
              gap: numColumns > 1 ? 16 : undefined,
            }}
          />
        </BottomSheetModal>
      </>
    );
  },
);
