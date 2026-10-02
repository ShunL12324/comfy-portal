import { isVideoUrl } from '@/features/generation/utils/media';

export type MediaViewerKind = 'image' | 'video';

/** One page of the viewer: a local file URI on native, a server URL on web. */
export interface MediaViewerItem {
  uri: string;
  kind: MediaViewerKind;
}

/** Icon actions on the top bar, right-aligned in this order. */
export type MediaViewerBarAction = 'save' | 'share' | 'delete';
/** Actions too rare for the bar, behind its `⋯` overflow menu. */
export type MediaViewerMenuAction = 'thumbnail';
export type MediaViewerAction = MediaViewerBarAction | MediaViewerMenuAction;

/** For callers that only hold URLs (run results, history); the extension decides the kind. */
export function toViewerItem(uri: string): MediaViewerItem {
  return { uri, kind: isVideoUrl(uri) ? 'video' : 'image' };
}

/** Keeps an index inside a list of `length` items; an empty list pins it to 0. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.round(index), 0), length - 1);
}

/** "3 / 12": position out of total. Nothing for a single item, where it would only add noise. */
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
 * Where the viewer lands after deleting the item at `deletedIndex`, given how
 * many remain: the next item, which has slid into the same place, or the
 * previous one when the last was deleted. -1 when nothing is left, which closes it.
 */
export function indexAfterDelete(deletedIndex: number, remaining: number): number {
  if (remaining <= 0) return -1;
  return clampIndex(deletedIndex, remaining);
}

/**
 * The top bar's actions for the item on screen. Save is always offered (a
 * download on web); Share only where a share sheet exists; Delete only where
 * the opening screen can delete. Setting the workflow thumbnail is rare, so it
 * sits in the overflow menu, and only for images where a workflow is known.
 * The viewer never shows a control that cannot work, nor an empty menu. A
 * view-only item (a server file streamed for preview, not a local result)
 * offers nothing: there is no local file to save or share.
 */
export function getViewerActions({
  canShare,
  canSetThumbnail,
  canDelete,
  kind,
  viewOnly = false,
}: {
  canShare: boolean;
  canSetThumbnail: boolean;
  canDelete: boolean;
  kind: MediaViewerKind | undefined;
  viewOnly?: boolean;
}): { bar: MediaViewerBarAction[]; menu: MediaViewerMenuAction[] } {
  if (!kind || viewOnly) return { bar: [], menu: [] };
  const bar: MediaViewerBarAction[] = ['save'];
  if (canShare) bar.push('share');
  if (canDelete) bar.push('delete');
  // A workflow thumbnail is a still; a video cannot be one.
  const menu: MediaViewerMenuAction[] = canSetThumbnail && kind === 'image' ? ['thumbnail'] : [];
  return { bar, menu };
}

/** Share of the page height an upward drag must cover to dismiss on release. */
export const DISMISS_DISTANCE = 0.2;
/** An upward flick at least this fast (pt/s) dismisses regardless of distance. */
export const DISMISS_VELOCITY = 900;

/** How far an upward drag is towards dismissing, 0–1; downward drags count as none. */
export function dismissProgress(translationY: number, height: number): number {
  'worklet';
  if (height <= 0 || translationY >= 0) return 0;
  return Math.min(-translationY / (height * DISMISS_DISTANCE), 1);
}

/** Whether a released drag closes the viewer: far enough up, or a clear upward flick. */
export function shouldDismiss(translationY: number, velocityY: number, height: number): boolean {
  'worklet';
  if (translationY >= 0) return false;
  return dismissProgress(translationY, height) >= 1 || -velocityY >= DISMISS_VELOCITY;
}
