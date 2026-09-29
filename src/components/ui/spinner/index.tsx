import React from 'react';
import { cssInterop } from 'nativewind';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';

cssInterop(RotatingSpinner, { className: { target: 'style', nativeStyleToProp: { color: true } } });

/**
 * Typed against what actually renders.
 *
 * This used to declare `ActivityIndicatorProps`, left over from when it wrapped
 * the platform indicator — it has rendered the shared ring for a while now, and
 * the ring accepts a different set of props. Only `size` keeps the
 * ActivityIndicator vocabulary, because every call site already passes
 * `small`/`large` and the ring measures in points.
 */
type RingProps = Omit<React.ComponentPropsWithoutRef<typeof RotatingSpinner>, 'size'>;

export const Spinner = React.forwardRef<
  React.ComponentRef<typeof RotatingSpinner>,
  RingProps & { size?: 'small' | 'large' | number }
>(function Spinner({ size = 'small', ...props }, ref) {
  return <RotatingSpinner ref={ref} size={size === 'small' ? 16 : size === 'large' ? 30 : size} {...props} />;
});
