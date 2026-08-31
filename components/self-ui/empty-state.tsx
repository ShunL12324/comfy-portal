import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { MotiView } from 'moti';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Lucide glyph, rendered at 64px. */
  icon: LucideIcon;
  /** Optional bold line above the message, for states that need naming. */
  title?: string;
  /** One sentence. Point at the control that fixes it rather than apologising. */
  children: ReactNode;
  /** Usually a link to a guide, or the button that populates the list. */
  action?: ReactNode;
  /** `center` fills the space it's given; `top` sits below whatever precedes it. */
  align?: 'center' | 'top';
  className?: string;
}

/**
 * What a list looks like when it has nothing in it.
 *
 * Twelve screens had grown their own version of this at three different icon
 * sizes and two different greys; the glyph is the largest thing on an
 * otherwise blank screen, so the inconsistency was visible. One component,
 * one size, one grey.
 */
export function EmptyState({ icon, title, children, action, align = 'top', className }: EmptyStateProps) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.98, translateY: 10 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      className={align === 'center' ? 'flex-1 justify-center' : undefined}
    >
      <VStack space="lg" className={`w-full items-center px-6 py-10 ${className ?? ''}`}>
        {/* The icon lands after the block it belongs to, so the eye follows
            copy first rather than watching a large glyph resolve. */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
        >
          <Icon as={icon} className="h-16 w-16 text-typography-200" />
        </MotiView>

        <View className="w-full max-w-[360px] items-center">
          <VStack space="xs" className="items-center">
            {title ? (
              <Text className="text-center text-base font-semibold text-content-heading">{title}</Text>
            ) : null}
            <Text className="text-center text-sm text-content-secondary">{children}</Text>
          </VStack>
        </View>

        {action}
      </VStack>
    </MotiView>
  );
}
