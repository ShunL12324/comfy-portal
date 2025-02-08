'use client';
import React from 'react';
import { createAvatar } from '@gluestack-ui/avatar';

import { View, Text, Image, Platform } from 'react-native';

import { tva } from '@gluestack-ui/nativewind-utils/tva';
import { withStyleContext, useStyleContext } from '@gluestack-ui/nativewind-utils/withStyleContext';
const SCOPE = 'AVATAR';
import type { VariantProps } from '@gluestack-ui/nativewind-utils';

const UIAvatar = createAvatar({
  Root: withStyleContext(View, SCOPE),
  Badge: View,
  Group: View,
  Image: Image,
  FallbackText: Text,
});

const avatarStyle = tva({
  base: 'relative items-center justify-center rounded-full bg-primary-600 group-[.avatar-group]/avatar-group:-ml-2.5',
  variants: {
    size: {
      xs: 'h-6 w-6',
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16',
      xl: 'h-24 w-24',
      '2xl': 'h-32 w-32',
    },
  },
});

const avatarFallbackTextStyle = tva({
  base: 'text-transform:uppercase overflow-hidden font-semibold text-typography-0 web:cursor-default',

  parentVariants: {
    size: {
      xs: 'text-2xs',
      sm: 'text-xs',
      md: 'text-base',
      lg: 'text-xl',
      xl: 'text-3xl',
      '2xl': 'text-5xl',
    },
  },
});

const avatarGroupStyle = tva({
  base: 'group/avatar-group avatar-group relative flex-row-reverse',
});

const avatarBadgeStyle = tva({
  base: 'absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-background-0 bg-success-500',
  parentVariants: {
    size: {
      xs: 'h-2 w-2',
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
      xl: 'h-6 w-6',
      '2xl': 'h-8 w-8',
    },
  },
});

const avatarImageStyle = tva({
  base: 'absolute h-full w-full rounded-full',
});

type IAvatarProps = Omit<React.ComponentPropsWithoutRef<typeof UIAvatar>, 'context'> & VariantProps<typeof avatarStyle>;

const Avatar = React.forwardRef<React.ElementRef<typeof UIAvatar>, IAvatarProps>(
  ({ className, size = 'md', ...props }, ref) => {
    return <UIAvatar ref={ref} {...props} className={avatarStyle({ size, class: className })} context={{ size }} />;
  },
);

type IAvatarBadgeProps = React.ComponentPropsWithoutRef<typeof UIAvatar.Badge> & VariantProps<typeof avatarBadgeStyle>;

const AvatarBadge = React.forwardRef<React.ElementRef<typeof UIAvatar.Badge>, IAvatarBadgeProps>(
  ({ className, size, ...props }, ref) => {
    const { size: parentSize } = useStyleContext(SCOPE);

    return (
      <UIAvatar.Badge
        ref={ref}
        {...props}
        className={avatarBadgeStyle({
          parentVariants: {
            size: parentSize,
          },
          size,
          class: className,
        })}
      />
    );
  },
);

type IAvatarFallbackTextProps = React.ComponentPropsWithoutRef<typeof UIAvatar.FallbackText> &
  VariantProps<typeof avatarFallbackTextStyle>;
const AvatarFallbackText = React.forwardRef<React.ElementRef<typeof UIAvatar.FallbackText>, IAvatarFallbackTextProps>(
  ({ className, size, ...props }, ref) => {
    const { size: parentSize } = useStyleContext(SCOPE);

    return (
      <UIAvatar.FallbackText
        ref={ref}
        {...props}
        className={avatarFallbackTextStyle({
          parentVariants: {
            size: parentSize,
          },
          size,
          class: className,
        })}
      />
    );
  },
);

type IAvatarImageProps = React.ComponentPropsWithoutRef<typeof UIAvatar.Image> & VariantProps<typeof avatarImageStyle>;

const AvatarImage = React.forwardRef<React.ElementRef<typeof UIAvatar.Image>, IAvatarImageProps>(
  ({ className, ...props }, ref) => {
    return (
      <UIAvatar.Image
        ref={ref}
        {...props}
        className={avatarImageStyle({
          class: className,
        })}
        // @ts-expect-error
        style={
          Platform.OS === 'web'
            ? // eslint-disable-next-line react-native/no-inline-styles
              { height: 'revert-layer', width: 'revert-layer' }
            : undefined
        }
      />
    );
  },
);

type IAvatarGroupProps = React.ComponentPropsWithoutRef<typeof UIAvatar.Group> & VariantProps<typeof avatarGroupStyle>;

const AvatarGroup = React.forwardRef<React.ElementRef<typeof UIAvatar.Group>, IAvatarGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <UIAvatar.Group
        ref={ref}
        {...props}
        className={avatarGroupStyle({
          class: className,
        })}
      />
    );
  },
);

export { Avatar, AvatarBadge, AvatarFallbackText, AvatarImage, AvatarGroup };
