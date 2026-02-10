import React, { forwardRef, memo } from 'react';
import { headingStyle } from './styles';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { filterRNProps } from '@/utils/web-props';

type IHeadingProps = VariantProps<typeof headingStyle> &
  React.ComponentPropsWithoutRef<'h1'> & {
    as?: React.ElementType;
  };

const MappedHeading = memo(
  forwardRef<HTMLHeadingElement, IHeadingProps>(function MappedHeading(
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
    const domProps = filterRNProps(props);
    const classes = headingStyle({
      size,
      isTruncated: isTruncated as boolean,
      bold: bold as boolean,
      underline: underline as boolean,
      strikeThrough: strikeThrough as boolean,
      sub: sub as boolean,
      italic: italic as boolean,
      highlight: highlight as boolean,
      class: className,
    });

    switch (size) {
      case '5xl':
      case '4xl':
      case '3xl':
        return <h1 className={classes} {...domProps} ref={ref} />;
      case '2xl':
        return <h2 className={classes} {...domProps} ref={ref} />;
      case 'xl':
        return <h3 className={classes} {...domProps} ref={ref} />;
      case 'lg':
        return <h4 className={classes} {...domProps} ref={ref} />;
      case 'md':
        return <h5 className={classes} {...domProps} ref={ref} />;
      case 'sm':
      case 'xs':
        return <h6 className={classes} {...domProps} ref={ref} />;
      default:
        return <h4 className={classes} {...domProps} ref={ref} />;
    }
  })
);

const Heading = memo(
  forwardRef<HTMLHeadingElement, IHeadingProps>(function Heading(
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
      const domProps = filterRNProps(props);
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
          {...domProps}
          ref={ref}
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
