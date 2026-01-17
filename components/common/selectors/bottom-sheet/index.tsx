import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useThemeStore } from '@/store/theme';
import {
  BottomSheetFlatList,
  BottomSheetModal
} from '@gorhom/bottom-sheet';
import { RefreshCw } from 'lucide-react-native';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Keyboard, ListRenderItem, View } from 'react-native';
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
    const { theme } = useThemeStore();
    const colors = useThemeColor();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    // Forward ref to parent
    useImperativeHandle(ref, () => bottomSheetRef.current!, []);

    // Workaround: manually restore position when keyboard hides
    // https://github.com/gorhom/react-native-bottom-sheet/issues/1894
    useEffect(() => {
      const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
        bottomSheetRef.current?.snapToIndex(0);
      });
      return () => hideSubscription.remove();
    }, []);

    // Define theme-based colors matching ThemedBottomSheetModal
    const backgroundColor = theme === 'dark'
      ? colors.background[100]
      : colors.background[50];

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

    const renderHandle = useCallback(
      () => (
        <View
          className="-mb-1 h-8 items-center justify-center rounded-t-[24px]"
          style={{ backgroundColor }}
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
        <ThemedBottomSheetModal
          ref={bottomSheetRef}
          snapPoints={['85%']}
          index={isVisible ? 0 : -1}
          enablePanDownToClose
          onDismiss={onClose}
          handleComponent={renderHandle}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
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
                  className="aspect-square rounded-lg border-0 bg-background-200 p-0"
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
        </ThemedBottomSheetModal>
      </>
    );
  },
);
