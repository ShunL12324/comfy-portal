import { tva } from '@gluestack-ui/utils/nativewind-utils';

/** Shared by the native and web Icon, so both resolve the same token sizes. */
export const iconStyle = tva({
  base: 'text-typography-950 fill-none pointer-events-none',
  variants: {
    // Each step is a designTokens.icon size.
    size: {
      'xs': 'size-icon-small',
      'sm': 'size-icon-control',
      'md': 'size-icon-medium',
      'lg': 'size-icon-large',
      'xl': 'size-icon-hero',
      'display': 'size-icon-display',
    },
  },
});
