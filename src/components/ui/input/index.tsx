'use client';
import { useCompactControls } from '@/components/ui/design-system/control-density';
import { designColors, designTokens as t } from '@/constants/design-tokens';
import { useResolvedTheme } from '@/store/theme';
import React from 'react';
import { SheetAwareTextInput } from '@/components/self-ui/adaptive-sheet-components';
import { createInput } from '@gluestack-ui/core/input/creator';
import { View, Pressable } from 'react-native';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { withStyleContext, useStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { PrimitiveIcon, UIIcon } from '@gluestack-ui/core/icon/creator';

const SCOPE = 'INPUT';

const UIInput = createInput({
  Root: withStyleContext(View, SCOPE),
  Icon: UIIcon,
  Slot: Pressable,
  Input: SheetAwareTextInput,
});

cssInterop(PrimitiveIcon, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: true,
      width: true,
      fill: true,
      color: 'classNameColor',
      stroke: true,
    },
  },
});

const inputStyle = tva({
  base: 'border-background-300 data-[hover=true]:border-outline-400 data-[focus=true]:border-primary-700 data-[focus=true]:hover:border-primary-700 data-[disabled=true]:opacity-disabled data-[disabled=true]:hover:border-background-300 flex-row content-center items-center overflow-hidden',

  variants: {
    size: {
      xl: 'h-12',
      lg: 'h-11',
      md: 'h-10',
      sm: 'h-9',
    },

    variant: {
      underlined:
        'data-[invalid=true]:border-error-700 data-[invalid=true]:hover:border-error-700 data-[invalid=true]:data-[focus=true]:border-error-700 data-[invalid=true]:data-[focus=true]:hover:border-error-700 data-[invalid=true]:data-[disabled=true]:hover:border-error-700 rounded-none border-b data-[invalid=true]:border-b-2',

      outline:
        'rounded-lg data-[invalid=true]:border-error-700 data-[invalid=true]:hover:border-error-700 data-[invalid=true]:data-[focus=true]:border-error-700 data-[invalid=true]:data-[focus=true]:hover:border-error-700 data-[invalid=true]:data-[disabled=true]:hover:border-error-700 data-[focus=true]:web:ring-1 data-[focus=true]:web:ring-inset data-[focus=true]:web:ring-indicator-primary data-[invalid=true]:web:ring-1 data-[invalid=true]:web:ring-inset data-[invalid=true]:web:ring-indicator-error data-[invalid=true]:data-[focus=true]:hover:web:ring-1 data-[invalid=true]:data-[focus=true]:hover:web:ring-inset data-[invalid=true]:data-[focus=true]:hover:web:ring-indicator-error data-[invalid=true]:data-[disabled=true]:hover:web:ring-1 data-[invalid=true]:data-[disabled=true]:hover:web:ring-inset data-[invalid=true]:data-[disabled=true]:hover:web:ring-indicator-error border',

      rounded:
        'data-[invalid=true]:border-error-700 data-[invalid=true]:hover:border-error-700 data-[invalid=true]:data-[focus=true]:border-error-700 data-[invalid=true]:data-[focus=true]:hover:border-error-700 data-[invalid=true]:data-[disabled=true]:hover:border-error-700 data-[focus=true]:web:ring-1 data-[focus=true]:web:ring-inset data-[focus=true]:web:ring-indicator-primary data-[invalid=true]:web:ring-1 data-[invalid=true]:web:ring-inset data-[invalid=true]:web:ring-indicator-error data-[invalid=true]:data-[focus=true]:hover:web:ring-1 data-[invalid=true]:data-[focus=true]:hover:web:ring-inset data-[invalid=true]:data-[focus=true]:hover:web:ring-indicator-error data-[invalid=true]:data-[disabled=true]:hover:web:ring-1 data-[invalid=true]:data-[disabled=true]:hover:web:ring-inset data-[invalid=true]:data-[disabled=true]:hover:web:ring-indicator-error rounded-full border',
    },
  },
});

const inputIconStyle = tva({
  base: 'text-typography-400 items-center justify-center fill-none',
  parentVariants: {
    size: {
      '2xs': 'size-icon-micro',
      xs: 'size-icon-small',
      sm: 'size-icon-control',
      md: 'size-icon-medium',
      lg: 'size-icon-large',
      xl: 'size-icon-hero',
    },
  },
});

const inputSlotStyle = tva({
  base: 'web:disabled:cursor-not-allowed items-center justify-center',
});

const inputFieldStyle = tva({
  base: 'font-body text-typography-900 py-0 px-3 placeholder:text-typography-500 ios:leading-0 web:cursor-text web:data-[disabled=true]:cursor-not-allowed h-full flex-1',

  parentVariants: {
    variant: {
      underlined: 'web:outline-0 web:outline-none px-0',
      outline: 'web:outline-0 web:outline-none',
      rounded: 'web:outline-0 web:outline-none px-4',
    },

    size: {
      '2xs': 'text-2xs',
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
  },
});

type IInputProps = React.ComponentProps<typeof UIInput> & VariantProps<typeof inputStyle> & { className?: string };
const Input = React.forwardRef<React.ComponentRef<typeof UIInput>, IInputProps>(function Input(
  { className, variant = 'outline', size = 'md', ...props },
  ref,
) {
  const compact = useCompactControls();
  const c = designColors[useResolvedTheme()];
  return (
    <UIInput
      ref={ref}
      {...props}
      style={[
        props.style,
        compact && {
          height: t.height.touch,
          borderRadius: t.radius.control,
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
      ]}
      className={inputStyle({ variant, size, class: className })}
      context={{ variant, size }}
    >
      {compact && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 0,
            right: 0,
            backgroundColor: c.well,
            borderRadius: t.radius.control,
          }}
        />
      )}
      {props.children}
    </UIInput>
  );
});

type IInputIconProps = React.ComponentProps<typeof UIInput.Icon> &
  VariantProps<typeof inputIconStyle> & {
    className?: string;
    height?: number;
    width?: number;
  };

const InputIcon = React.forwardRef<React.ComponentRef<typeof UIInput.Icon>, IInputIconProps>(function InputIcon(
  { className, size, ...props },
  ref,
) {
  const { size: parentSize } = useStyleContext(SCOPE);

  if (typeof size === 'number') {
    return <UIInput.Icon ref={ref} {...props} className={inputIconStyle({ class: className })} size={size} />;
  } else if ((props.height !== undefined || props.width !== undefined) && size === undefined) {
    return <UIInput.Icon ref={ref} {...props} className={inputIconStyle({ class: className })} />;
  }
  return (
    <UIInput.Icon
      ref={ref}
      {...props}
      className={inputIconStyle({
        parentVariants: {
          size: parentSize,
        },
        class: className,
      })}
    />
  );
});

type IInputSlotProps = React.ComponentProps<typeof UIInput.Slot> &
  VariantProps<typeof inputSlotStyle> & { className?: string };

const InputSlot = React.forwardRef<React.ComponentRef<typeof UIInput.Slot>, IInputSlotProps>(function InputSlot(
  { className, ...props },
  ref,
) {
  return (
    <UIInput.Slot
      ref={ref}
      {...props}
      className={inputSlotStyle({
        class: className,
      })}
    />
  );
});

type IInputFieldProps = React.ComponentProps<typeof UIInput.Input> &
  VariantProps<typeof inputFieldStyle> & { className?: string };

const InputField = React.forwardRef<React.ComponentRef<typeof UIInput.Input>, IInputFieldProps>(function InputField(
  { className, ...props },
  ref,
) {
  const { variant: parentVariant, size: parentSize } = useStyleContext(SCOPE);
  const compact = useCompactControls();

  return (
    <UIInput.Input
      ref={ref}
      {...props}
      style={[
        props.style,
        compact && {
          ...t.node.body,
          height: t.height.control,
          paddingHorizontal: t.node.inset,
          paddingVertical: 0,
          ...(props.keyboardType === 'numeric' || props.keyboardType === 'numbers-and-punctuation'
            ? { fontVariant: ['tabular-nums' as const] }
            : {}),
        },
      ]}
      className={inputFieldStyle({
        parentVariants: {
          variant: parentVariant,
          size: parentSize,
        },
        class: className,
      })}
    />
  );
});

Input.displayName = 'Input';
InputIcon.displayName = 'InputIcon';
InputSlot.displayName = 'InputSlot';
InputField.displayName = 'InputField';

export { Input, InputField, InputIcon, InputSlot };
