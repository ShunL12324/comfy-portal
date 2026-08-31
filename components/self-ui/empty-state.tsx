import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { MotiView } from 'moti';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /**
   * The human moment — the one line that admits there's nothing here. Set in
   * serif italic, so it reads as a sentence someone wrote rather than a system
   * message. Keep it short: "Nothing here yet."
   */
  title?: string;
  /** What to do about it, in the sans that carries every other instruction. */
  children: ReactNode;
  /** Usually a link to a guide, or the control that fills the list. */
  action?: ReactNode;
  /** `center` fills the space it's given; `top` sits under whatever precedes it. */
  align?: 'center' | 'top';
  className?: string;
}

/**
 * What a list looks like when it has nothing in it.
 *
 * No large grey glyph: the design system spends its one serif on moments like
 * this instead, and a 64px outline icon over an otherwise blank screen was
 * always the loudest thing on it. A line of italic and a hairline is quieter
 * and says the same thing.
 */
export function EmptyState({ title, children, action, align = 'top', className }: EmptyStateProps) {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 240 }}
      className={align === 'center' ? 'flex-1 justify-center' : undefined}
    >
      <VStack space="md" className={`w-full px-1 py-8 ${className ?? ''}`}>
        <View className="border-t border-ink/10" />
        <VStack space="sm" className="py-2">
          {title ? <Text className="font-serif-italic text-lg text-content-body">{title}</Text> : null}
          <Text className="text-sm text-content-tertiary">{children}</Text>
        </VStack>
        {action ? <View className="pt-1">{action}</View> : null}
        <View className="border-t border-ink/10" />
      </VStack>
    </MotiView>
  );
}
