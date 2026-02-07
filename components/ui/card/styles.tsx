import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { isWeb } from '@gluestack-ui/utils/nativewind-utils';
const baseStyle = isWeb ? 'flex flex-col relative z-0' : '';

export const cardStyle = tva({
  base: baseStyle,
  variants: {
    size: {
      sm: 'rounded p-3',
      md: 'rounded-md p-4',
      lg: 'rounded-xl p-6',
    },
    variant: {
      elevated: 'bg-background-0',
      outline: 'border border-outline-200',
      ghost: 'rounded-none',
      filled: 'bg-background-50',
    },
  },
});
