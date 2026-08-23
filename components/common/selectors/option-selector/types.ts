import React from 'react';

export interface OptionSelectorProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{
    value: T;
    label: string;
    description?: string;
    icon?: React.ReactNode;
  }>;
  title?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
}
