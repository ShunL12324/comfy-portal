/**
 * Which rows of a list are on screen, for rows that only do work there (such
 * as asking for a poster frame). The list reports through `update`; each row
 * subscribes to its own key, so a scroll re-renders only the rows that
 * entered or left.
 */
export interface VisibleRows {
  update: (keys: Iterable<string>) => void;
  has: (key: string) => boolean;
  subscribe: (listener: () => void) => () => void;
}

export function createVisibleRows(): VisibleRows {
  let visible = new Set<string>();
  const listeners = new Set<() => void>();
  return {
    update: (keys) => {
      const next = new Set(keys);
      const changed = next.size !== visible.size || [...next].some((key) => !visible.has(key));
      visible = next;
      if (changed) listeners.forEach((listener) => listener());
    },
    has: (key) => visible.has(key),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
