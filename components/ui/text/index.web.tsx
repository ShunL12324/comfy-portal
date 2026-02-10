import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { textStyle } from './styles';
import { filterRNProps } from '@/utils/web-props';

type ITextProps = React.ComponentProps<'span'> & VariantProps<typeof textStyle>;

const Text = React.forwardRef<React.ComponentRef<'span'>, ITextProps>(
  function Text(
    {
      className,
      isTruncated,
      bold,
      underline,
      strikeThrough,
      size = 'md',
      sub,
      italic,
      highlight,
      ...props
    }: { className?: string } & ITextProps,
    ref
  ) {
    const domProps = filterRNProps(props);

    return (
      <span
        className={textStyle({
          isTruncated: isTruncated as boolean,
          bold: bold as boolean,
          underline: underline as boolean,
          strikeThrough: strikeThrough as boolean,
          size,
          sub: sub as boolean,
          italic: italic as boolean,
          highlight: highlight as boolean,
          class: className,
        })}
        {...domProps}
        ref={ref}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text };
