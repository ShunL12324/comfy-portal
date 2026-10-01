import { isVideoUrl } from '@/features/generation/utils/media';

export type MediaViewerKind = 'image' | 'video';

/** One page of the viewer: a local file URI on native, a server URL on web. */
export interface MediaViewerItem {
  uri: string;
  kind: MediaViewerKind;
}

export type MediaViewerAction = 'save' | 'share' | 'thumbnail' | 'delete';

/** For callers that only hold URLs (run results, history); the extension decides the kind. */
export function toViewerItem(uri: string): MediaViewerItem {
  return { uri, kind: isVideoUrl(uri) ? 'video' : 'image' };
}

/** Keeps an index inside a list of `length` items; an empty list pins it to 0. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.round(index), 0), length - 1);
}

/** "3 / 12", or nothing for a single item, where a counter would only add noise. */
export function formatCounter(index: number, length: number): string | undefined {
  if (length <= 1) return undefined;
  return `${clampIndex(index, length) + 1} / ${length}`;
}

/** The page a horizontal pager rests on, from its scroll offset. */
export function pageFromOffset(offset: number, pageWidth: number, length: number): number {
  if (pageWidth <= 0) return 0;
  return clampIndex(offset / pageWidth, length);
}

/**
 * Bottom-bar actions in display order. Save is always offered (a download on
 * web); the rest appear only where the platform or the opening screen supports
 * them, so the viewer never shows a control that cannot work.
 */
export function getViewerActions({
  canShare,
  canSetThumbnail,
  canDelete,
  kind,
}: {
  canShare: boolean;
  canSetThumbnail: boolean;
  canDelete: boolean;
  kind: MediaViewerKind | undefined;
}): MediaViewerAction[] {
  if (!kind) return [];
  const actions: MediaViewerAction[] = ['save'];
  if (canShare) actions.push('share');
  // A workflow thumbnail is a still; a video cannot be one.
  if (canSetThumbnail && kind === 'image') actions.push('thumbnail');
  if (canDelete) actions.push('delete');
  return actions;
}
