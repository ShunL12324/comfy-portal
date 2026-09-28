import { AdaptiveFlatList } from '@/components/self-ui/adaptive-sheet-components';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Action, Copy } from '@/components/ui/design-system/primitives';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { RefreshCw } from '@/constants/icons';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Keyboard, ListRenderItem, View } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';
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
      emptyComponent,
      numColumns = 1,
    },
    ref,
  ) {
    const [searchQuery, setSearchQuery] = useState('');
    const [listWidth, setListWidth] = useState(0);
    const columnWidth = (listWidth - t.layout.inset * 2 - t.layout.list * (numColumns - 1)) / numColumns;
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const presented = useRef(false);
    useEffect(() => {
      if (isVisible) {
        presented.current = true;
        bottomSheetRef.current?.present();
        setSearchQuery('');
      } else if (presented.current) {
        presented.current = false;
        bottomSheetRef.current?.dismiss();
      }
    }, [isVisible]);
    const handleDismiss = useCallback(() => {
      presented.current = false;
      onClose();
    }, [onClose]);

    // Forward ref to parent
    useImperativeHandle(ref, () => bottomSheetRef.current!, []);

    // Workaround: manually restore position when keyboard hides
    // https://github.com/gorhom/react-native-bottom-sheet/issues/1894
    // Guard with isVisible to prevent conflicts with other BottomSheets.
    useEffect(() => {
      const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
        if (isVisible) {
          bottomSheetRef.current?.snapToIndex(0);
        }
      });
      return () => hideSubscription.remove();
    }, [isVisible]);

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

    const selectedOption = options.find((option) => option.value === value);

    return (
      <>
        {renderTrigger?.(selectedOption)}
        <ThemedBottomSheetModal
          ref={bottomSheetRef}
          stackBehavior="push"
          snapPoints={['85%']}
          index={0}
          enableDynamicSizing={false}
          enablePanDownToClose
          onDismiss={handleDismiss}
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
              showRefreshButton ? (
                <Action
                  kind="tonal"
                  icon={RefreshCw}
                  label="Refresh options"
                  loading={isVisible && isRefreshing}
                  loadingAnimation="rotate-icon"
                  onPress={onRefresh}
                />
              ) : undefined
            }
          />
          <AdaptiveFlatList
            testID="selector-options"
            onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
            data={filteredOptions}
            keyExtractor={(item: SelectorOption) => item.value}
            renderItem={
              renderItem
                ? ({ item }: { item: SelectorOption }) =>
                    numColumns > 1 ? (
                      <View style={listWidth ? { width: columnWidth } : { flex: 1 }}>
                        {renderItem(item, item.value === value)}
                      </View>
                    ) : (
                      React.createElement(React.Fragment, null, renderItem(item, item.value === value))
                    )
                : defaultRenderItem
            }
            numColumns={numColumns}
            ListEmptyComponent={
              options.length > 0 ? (
                <View style={{ paddingVertical: t.layout.section }}>
                  <Copy muted style={{ textAlign: 'center' }}>
                    No matching options
                  </Copy>
                </View>
              ) : emptyComponent ? (
                // FlatList injects an RN style array into its empty root. Keep
                // that root native even when the supplied content is a web stack.
                <View style={{ flex: 1 }}>{emptyComponent}</View>
              ) : undefined
            }
            columnWrapperStyle={numColumns > 1 ? { gap: t.layout.list } : undefined}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: t.layout.section,
              paddingHorizontal: t.layout.inset,
              gap: t.layout.list,
            }}
          />
        </ThemedBottomSheetModal>
      </>
    );
  },
);
