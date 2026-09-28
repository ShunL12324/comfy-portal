import React, { forwardRef, memo } from 'react';
import { H1 as ExpoH1, H2 as ExpoH2, H3 as ExpoH3, H4 as ExpoH4, H5 as ExpoH5, H6 as ExpoH6 } from '@expo/html-elements';
import { headingStyle } from './styles';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';
import { resolveTypography } from '@/components/ui/design-system/typography';

function withTypography(Component: typeof ExpoH1) {
  const Wrapped = forwardRef<React.ComponentRef<typeof ExpoH1>, React.ComponentProps<typeof ExpoH1>>(
    function TypographyHeading({ style, ...props }, ref) {
      // Expo's DOM declarations include CSS styles and a constructor ref;
      // its native implementation forwards the RN styles and ref unchanged.
      return <Component {...props} ref={ref as any} style={[style, resolveTypography(style as any)]} />;
    },
  );
  return Wrapped;
}
const H1 = withTypography(ExpoH1);
const H2 = withTypography(ExpoH2);
const H3 = withTypography(ExpoH3);
const H4 = withTypography(ExpoH4);
const H5 = withTypography(ExpoH5);
const H6 = withTypography(ExpoH6);

type IHeadingProps = VariantProps<typeof headingStyle> &
  React.ComponentPropsWithoutRef<typeof H1> & {
    as?: React.ElementType;
  };

cssInterop(H1, { className: 'style' });
cssInterop(H2, { className: 'style' });
cssInterop(H3, { className: 'style' });
cssInterop(H4, { className: 'style' });
cssInterop(H5, { className: 'style' });
cssInterop(H6, { className: 'style' });

const MappedHeading = memo(
  forwardRef<React.ComponentRef<typeof H1>, IHeadingProps>(
    function MappedHeading(
      {
        size,
        className,
        isTruncated,
        bold,
        underline,
        strikeThrough,
        sub,
        italic,
        highlight,
        ...props
      },
      ref
    ) {
      switch (size) {
        case '5xl':
        case '4xl':
        case '3xl':
          return (
            <H1
              className={headingStyle({
                size,
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })}
              {...props}
              ref={ref}
            />
          );
        case '2xl':
          return (
            <H2
              className={headingStyle({
                size,
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })}
              {...props}
              ref={ref}
            />
          );
        case 'xl':
          return (
            <H3
              className={headingStyle({
                size,
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })}
              {...props}
              ref={ref}
            />
          );
        case 'lg':
          return (
            <H4
              className={headingStyle({
                size,
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })}
              {...props}
              ref={ref}
            />
          );
        case 'md':
          return (
            <H5
              className={headingStyle({
                size,
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })}
              {...props}
              ref={ref}
            />
          );
        case 'sm':
        case 'xs':
          return (
            <H6
              className={headingStyle({
                size,
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })}
              {...props}
              ref={ref}
            />
          );
        default:
          return (
            <H4
              className={headingStyle({
                size,
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })}
              {...props}
              ref={ref}
            />
          );
      }
    }
  )
);

const Heading = memo(
  forwardRef<React.ComponentRef<typeof H1>, IHeadingProps>(function Heading(
    { className, size = 'lg', as: AsComp, ...props },
    ref
  ) {
    const {
      isTruncated,
      bold,
      underline,
      strikeThrough,
      sub,
      italic,
      highlight,
    } = props;

    if (AsComp) {
      return (
        <AsComp
          className={headingStyle({
            size,
            isTruncated: isTruncated as boolean,
            bold: bold as boolean,
            underline: underline as boolean,
            strikeThrough: strikeThrough as boolean,
            sub: sub as boolean,
            italic: italic as boolean,
            highlight: highlight as boolean,
            class: className,
          })}
          {...props}
        />
      );
    }

    return (
      <MappedHeading className={className} size={size} ref={ref} {...props} />
    );
  })
);

Heading.displayName = 'Heading';

export { Heading };
