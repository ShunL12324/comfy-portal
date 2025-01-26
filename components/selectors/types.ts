export interface SelectorOption {
  value: string;
  label: string;
  description?: string;
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
  numColumns?: number;
} 