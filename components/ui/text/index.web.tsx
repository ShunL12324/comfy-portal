import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { textStyle } from './styles';
import type { TextProps } from 'react-native';
import { filterRNProps } from '@/utils/web-props';
import { resolveWebTypography } from '@/components/ui/design-system/typography';

type ITextProps = React.ComponentProps<'span'> &
  VariantProps<typeof textStyle> &
  Pick<TextProps, 'numberOfLines' | 'ellipsizeMode'>;

const Text = React.forwardRef<React.ComponentRef<'span'>, ITextProps>(function Text(
  {
    className,
    isTruncated,
    numberOfLines,
    bold,
    underline,
    strikeThrough,
    size = 'md',
    sub,
    italic,
    highlight,
    ...props
  }: { className?: string } & ITextProps,
  ref,
) {
  const domProps = filterRNProps(props) as React.ComponentProps<'span'>;
  const lines = isTruncated ? 1 : numberOfLines;
  const truncation: React.CSSProperties | undefined =
    lines === 1
      ? { display: 'block', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
      : lines && lines > 1
        ? {
            display: '-webkit-box',
            minWidth: 0,
            overflow: 'hidden',
            overflowWrap: 'anywhere',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: lines,
          }
        : undefined;

  const classes = textStyle({
    isTruncated,
    bold,
    underline,
    strikeThrough,
    size,
    sub,
    italic,
    highlight,
    class: className,
  });
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
      style={{ ...domProps.style, ...resolveWebTypography(domProps.style as any, classes), ...truncation }}
      ref={ref}
    />
  );
});

Text.displayName = 'Text';

export { Text };
