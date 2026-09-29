import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { resolveTypography } from '@/components/ui/design-system/typography';

/** Font adapter for the existing Gluestack creator slots; preserves RN semantics. */
export const NativeText = React.forwardRef<React.ComponentRef<typeof RNText>, TextProps & { className?: string }>(
  function NativeText({ style, ...props }, ref) {
    return <RNText {...props} ref={ref} style={[style, resolveTypography(style)]} />;
  },
);
cssInterop(NativeText, { className: 'style' });
