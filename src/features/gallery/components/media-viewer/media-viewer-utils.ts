import { isVideoUrl } from '@/features/generation/utils/media';

export type MediaViewerKind = 'image' | 'video';

/** One page of the viewer: a local file URI on native, a server URL on web. */
export interface MediaViewerItem {
  uri: string;
  kind: MediaViewerKind;
  /** When the item was produced: epoch milliseconds or an ISO string. */
  createdAt?: number | string;
  /** The workflow that produced it, where the opening screen knows. */
  source?: string;
}

/** Facts measured from the media itself once it loads. */
export interface MediaViewerInfo {
  width?: number;
  height?: number;
  /** Seconds; videos only. */
  duration?: number;
}

export type MediaViewerAction = 'save' | 'share' | 'thumbnail' | 'delete';

/** For callers that only hold URLs (run results, history); the extension decides the kind. */
export function toViewerItem(uri: string, extra?: Pick<MediaViewerItem, 'createdAt' | 'source'>): MediaViewerItem {
  return { uri, kind: isVideoUrl(uri) ? 'video' : 'image', ...extra };
}

/** Keeps an index inside a list of `length` items; an empty list pins it to 0. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.round(index), 0), length - 1);
}

/**
 * "03/12": the position padded to the width of the total, so the readout does
 * not shift as it counts. Nothing for a single item, where it would only add noise.
 */
export function formatCounter(index: number, length: number): string | undefined {
  if (length <= 1) return undefined;
  const total = String(length);
  return `${String(clampIndex(index, length) + 1).padStart(total.length, '0')}/${total}`;
}

/** The page a horizontal pager rests on, from its scroll offset. */
export function pageFromOffset(offset: number, pageWidth: number, length: number): number {
  if (pageWidth <= 0) return 0;
  return clampIndex(offset / pageWidth, length);
}

/** "PNG" from a file path or a ComfyUI `/view?filename=…` URL; nothing without an extension. */
export function fileTypeLabel(uri: string): string | undefined {
  const [base, query] = uri.split('?');
  let path = base;
  if (query) {
    const filename = /(?:^|&)filename=([^&]*)/.exec(query)?.[1];
    if (filename) path = decodeURIComponent(filename);
  }
  const match = /\.([a-z0-9]{2,5})$/i.exec(path);
  return match ? match[1].toUpperCase() : undefined;
}

/** "1024×1536", or nothing until both sides are known. */
export function formatDimensions(width?: number, height?: number): string | undefined {
  if (!width || !height || width <= 0 || height <= 0) return undefined;
  return `${Math.round(width)}×${Math.round(height)}`;
}

/** "0:05", "12:40", "1:02:03". */
export function formatDuration(seconds?: number): string | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const total = Math.max(1, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "2026-09-30 14:22" in local time; nothing for a missing or unreadable date. */
export function formatCreated(value?: number | string): string | undefined {
  if (value === undefined || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The strip's readout. The first line identifies the item (position, file type,
 * length, pixel size); the second says when and from what it was made. Unknown
 * facts are left out rather than shown as placeholders, and an empty line is
 * dropped. The spoken label carries the same facts in words.
 */
export function buildReadout({
  item,
  index,
  length,
  info,
}: {
  item: MediaViewerItem;
  index: number;
  length: number;
  info?: MediaViewerInfo;
}): { lines: string[]; accessibilityLabel: string } {
  const counter = formatCounter(index, length);
  const type = fileTypeLabel(item.uri);
  const dimensions = formatDimensions(info?.width, info?.height);
  const duration = item.kind === 'video' ? formatDuration(info?.duration) : undefined;
  const created = formatCreated(item.createdAt);
  const source = item.source?.trim() || undefined;

  const first = [counter, type, duration, dimensions].filter(Boolean).join(READOUT_GAP);
  const second = [created, source?.toUpperCase()].filter(Boolean).join(READOUT_GAP);

  const kind = item.kind === 'video' ? 'Video' : 'Image';
  const spoken = [
    length > 1 ? `${kind} ${clampIndex(index, length) + 1} of ${length}` : kind,
    type,
    duration && `${duration} long`,
    dimensions?.replace('×', ' by '),
    created && `created ${created}`,
    source && `from ${source}`,
  ].filter(Boolean);

  return { lines: [first, second].filter(Boolean), accessibilityLabel: spoken.join(', ') };
}

/** Fields in a readout line are spaced, not punctuated, like a panel display. */
const READOUT_GAP = '   ';

/**
 * Strip actions in display order. Save is always offered (a download on web);
 * the rest appear only where the platform or the opening screen supports them,
 * so the viewer never shows a control that cannot work. Delete comes last and
 * is drawn apart from the others.
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

/** Share of the page height a downward drag must cover to dismiss on release. */
export const DISMISS_DISTANCE = 0.2;
/** A downward flick at least this fast (pt/s) dismisses regardless of distance. */
export const DISMISS_VELOCITY = 900;

/** How far a downward drag is towards dismissing, 0–1; upward drags count as none. */
export function dismissProgress(translationY: number, height: number): number {
  'worklet';
  if (height <= 0 || translationY <= 0) return 0;
  return Math.min(translationY / (height * DISMISS_DISTANCE), 1);
}

/** Whether a released drag closes the viewer: far enough, or a clear downward flick. */
export function shouldDismiss(translationY: number, velocityY: number, height: number): boolean {
  'worklet';
  if (translationY <= 0) return false;
  return dismissProgress(translationY, height) >= 1 || velocityY >= DISMISS_VELOCITY;
}
