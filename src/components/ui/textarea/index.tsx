'use client';
import { useCompactControls } from '@/components/ui/design-system/control-density';
import { designTokens as t } from '@/constants/design-tokens';
import React from 'react';
import { SheetAwareTextInput } from '@/components/self-ui/adaptive-sheet-components';
import { createTextarea } from '@gluestack-ui/core/textarea/creator';
import { View } from 'react-native';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { withStyleContext, useStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const SCOPE = 'TEXTAREA';
const UITextarea = createTextarea({
  Root: withStyleContext(View, SCOPE),
  Input: SheetAwareTextInput,
});

const textareaStyle = tva({
  base: 'border-background-300 rounded-lg data-[hover=true]:border-outline-400 data-[focus=true]:border-primary-700 data-[focus=true]:data-[hover=true]:border-primary-700 data-[disabled=true]:opacity-disabled data-[disabled=true]:bg-background-50 data-[disabled=true]:data-[hover=true]:border-background-300 h-[100px] w-full border',

  variants: {
    variant: {
      default:
        'data-[focus=true]:border-primary-700 data-[focus=true]:web:ring-1 data-[focus=true]:web:ring-inset data-[focus=true]:web:ring-indicator-primary data-[invalid=true]:border-error-700 data-[invalid=true]:web:ring-1 data-[invalid=true]:web:ring-inset data-[invalid=true]:web:ring-indicator-error data-[invalid=true]:data-[hover=true]:border-error-700 data-[invalid=true]:data-[focus=true]:data-[hover=true]:border-primary-700 data-[invalid=true]:data-[focus=true]:data-[hover=true]:web:ring-1 data-[invalid=true]:data-[focus=true]:data-[hover=true]:web:ring-inset data-[invalid=true]:data-[focus=true]:data-[hover=true]:web:ring-indicator-primary data-[invalid=true]:data-[disabled=true]:data-[hover=true]:border-error-700 data-[invalid=true]:data-[disabled=true]:data-[hover=true]:web:ring-1 data-[invalid=true]:data-[disabled=true]:data-[hover=true]:web:ring-inset data-[invalid=true]:data-[disabled=true]:data-[hover=true]:web:ring-indicator-error',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
      xl: '',
    },
  },
});

const textareaInputStyle = tva({
  base: 'font-body p-2 web:outline-0 web:outline-none color-typography-900 placeholder:text-typography-500 web:cursor-text web:data-[disabled=true]:cursor-not-allowed flex-1',
  parentVariants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },
});

type ITextareaProps = React.ComponentProps<typeof UITextarea> & VariantProps<typeof textareaStyle>;

const Textarea = React.forwardRef<React.ComponentRef<typeof UITextarea>, ITextareaProps>(function Textarea(
  { className, variant = 'default', size = 'md', ...props },
  ref,
) {
  const compact = useCompactControls();
  return (
    <UITextarea
      ref={ref}
      {...props}
      style={[props.style, compact && { height: t.node.promptHeight, borderRadius: t.radius.control }]}
      className={textareaStyle({ variant, class: className })}
      context={{ size }}
    />
  );
});

type ITextareaInputProps = React.ComponentProps<typeof UITextarea.Input> & VariantProps<typeof textareaInputStyle>;

const TextareaInput = React.forwardRef<React.ComponentRef<typeof UITextarea.Input>, ITextareaInputProps>(
  function TextareaInput({ className, ...props }, ref) {
    const { size: parentSize } = useStyleContext(SCOPE);
    const compact = useCompactControls();

    return (
      <UITextarea.Input
        ref={ref}
        {...props}
        style={[
          props.style,
          compact && { ...t.node.body, paddingHorizontal: t.node.inset, paddingVertical: t.node.inlineGap },
        ]}
        textAlignVertical="top"
        className={textareaInputStyle({
          parentVariants: {
            size: parentSize,
          },
          class: className,
        })}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
TextareaInput.displayName = 'TextareaInput';

export { Textarea, TextareaInput };
