import { useWindowDimensions } from 'react-native';

export type DeviceLayout = 'compact' | 'regular' | 'expanded';

interface DeviceLayoutResult {
  /** compact: <768 | regular: 768-1024 | expanded: >1024 */
  layout: DeviceLayout;
  /** Whether the device is in landscape orientation */
  isLandscape: boolean;
  /** Whether width >= 768 (tablet-width territory) */
  isTabletWidth: boolean;
  /** Current window width */
  width: number;
  /** Current window height */
  height: number;
}

/**
 * Core hook for all responsive layout decisions.
 * Uses window width breakpoints (not Platform.isPad) so it works
 * correctly in iPad Split View / Slide Over modes.
 */
export function useDeviceLayout(): DeviceLayoutResult {
  const { width, height } = useWindowDimensions();

  const layout: DeviceLayout =
    width >= 1024 ? 'expanded' : width >= 768 ? 'regular' : 'compact';

  return {
    layout,
    isLandscape: width > height,
    isTabletWidth: width >= 768,
    width,
    height,
  };
}
