import { Copy, Row } from '@/components/ui/design-system/primitives';
import { Spinner } from '@/components/ui/spinner';
import { designTokens as t } from '@/constants/design-tokens';
import { isVideoUrl } from '@/features/generation/utils/media';
import type { ResultPage } from '@/features/generation/utils/run-results';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';

import { MediaBadge } from './media-badge';

const ENTER_EASING = Easing.bezier(...t.easing.enter);

/** A result page for an output that is still downloading. */
export function PendingResultPage({ position, total }: { position: number; total: number }) {
  return (
    <View
      className="bg-surface-base"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.layout.section }}
    >
      <Row style={{ gap: t.layout.related }}>
        <Spinner size="small" />
        <Copy muted size="label">
          Saving result {position} of {total}
        </Copy>
      </Row>
    </View>
  );
}

/** Fades a result in as it replaces its placeholder page; instant under Reduce Motion. */
export function ResultAppear({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={reduced ? undefined : FadeIn.duration(t.motion.enter).easing(ENTER_EASING)}
    >
      {children}
    </Animated.View>
  );
}

function dotClass(pending: boolean, active: boolean) {
  if (pending) return active ? 'border border-action' : 'border border-stroke';
  return active ? 'bg-action' : 'bg-stroke';
}

/** Page dots; pages still downloading are hollow. */
export function PageDots({ pages, activeIndex }: { pages: ResultPage[]; activeIndex: number }) {
  if (pages.length <= 1) return null;
  return (
    <View
      pointerEvents="none"
      className="gap-2 absolute flex-row justify-center"
      style={{ left: 0, right: 0, bottom: t.layout.field }}
    >
      {pages.map((page, index) => (
        <View key={index} className={`h-2 w-2 rounded-full ${dotClass(page.kind === 'pending', index === activeIndex)}`} />
      ))}
    </View>
  );
}

/** Media type and page-count badges at the top right of the result area. */
export function ResultBadges({ pages, activeIndex }: { pages: ResultPage[]; activeIndex: number }) {
  const page = pages[activeIndex];
  const label = page?.kind === 'media' ? (isVideoUrl(page.uri) ? 'Video' : 'Image') : 'Saving';
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: t.layout.field,
        right: t.layout.field,
        flexDirection: 'row',
        gap: t.layout.label,
      }}
    >
      <MediaBadge>{label}</MediaBadge>
      {pages.length > 1 && (
        <MediaBadge>
          {activeIndex + 1}/{pages.length}
        </MediaBadge>
      )}
    </View>
  );
}
