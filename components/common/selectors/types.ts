import React from 'react';

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
}
