import React from 'react';
import { FlatListProps } from 'react-native';

export interface SelectorOption {
  value: string;
  label: string;
  description?: string;
  /** Optional leading visual, e.g. a provider logo. */
  icon?: React.ReactNode;
  image?: string;
  serverName?: string;
}

export interface SearchableBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  options: SelectorOption[];
  value?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  renderTrigger?: (selectedOption: SelectorOption | undefined) => React.ReactNode;
  renderItem?: (item: SelectorOption, isSelected: boolean) => React.ReactNode;
  /** Shown in place of the list when there is nothing to show. */
  emptyComponent?: React.ReactNode;
  numColumns?: number;
  /** Passed to the list, for rows that only do work while on screen. Both must stay stable. */
  onViewableItemsChanged?: FlatListProps<SelectorOption>['onViewableItemsChanged'];
  viewabilityConfig?: FlatListProps<SelectorOption>['viewabilityConfig'];
}
