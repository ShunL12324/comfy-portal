/** A rectangle in points, origin top-left. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Share of a grid tile that must be on screen for the viewer to return into it. */
export const MIN_VISIBLE_SHARE = 0.5;

/** A rectangle with a real, finite, positive size; measurements of unmounted or clipped views fail this. */
export function isUsableRect(rect: Rect | undefined | null): rect is Rect {
  return (
    !!rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0
  );
}

/** Media of `aspect` (width / height) fitted inside `bounds` and centred, as the viewer's pages show it. */
export function fitRect(aspect: number, bounds: Size): Rect {
  if (!(aspect > 0) || bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0, width: bounds.width, height: bounds.height };
  }
  const wide = aspect >= bounds.width / bounds.height;
  const width = wide ? bounds.width : bounds.height * aspect;
  const height = wide ? bounds.width / aspect : bounds.height;
  return { x: (bounds.width - width) / 2, y: (bounds.height - height) / 2, width, height };
}

export function offsetRect(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

/** The rectangle `progress` of the way from `from` (0) to `to` (1). */
export function lerpRect(from: Rect, to: Rect, progress: number): Rect {
  'worklet';
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    width: from.width + (to.width - from.width) * progress,
    height: from.height + (to.height - from.height) * progress,
  };
}

/** How much of `rect` lies inside `viewport`, 0–1. */
export function visibleShare(rect: Rect, viewport: Rect): number {
  if (!isUsableRect(rect) || !isUsableRect(viewport)) return 0;
  const width = Math.min(rect.x + rect.width, viewport.x + viewport.width) - Math.max(rect.x, viewport.x);
  const height = Math.min(rect.y + rect.height, viewport.y + viewport.height) - Math.max(rect.y, viewport.y);
  if (width <= 0 || height <= 0) return 0;
  return (width * height) / (rect.width * rect.height);
}

/** Whether enough of `rect` shows inside every one of `viewports` to animate into it. */
export function isRectVisible(rect: Rect, ...viewports: Rect[]): boolean {
  return viewports.every((viewport) => visibleShare(rect, viewport) >= MIN_VISIBLE_SHARE);
}

/** A native view's frame in window coordinates; undefined when it has no usable frame. */
export function measureInWindow(view: {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}): Promise<Rect | undefined> {
  return new Promise((resolve) => {
    view.measureInWindow((x, y, width, height) => {
      const rect = { x, y, width, height };
      resolve(isUsableRect(rect) ? rect : undefined);
    });
  });
}
