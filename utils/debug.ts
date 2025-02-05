import { Platform } from 'react-native';

const DEBUG_PREFIX = '[DEBUG]';
const RENDER_PREFIX = '[RENDER]';
const STATE_PREFIX = '[STATE]';

/**
 * Debug environment detection
 */
export const isDebugEnv = __DEV__ && !Platform.isTV;

/**
 * Format component name for logging
 */
const formatComponentName = (name: string) => {
  return `${name}`;
};

/**
 * Log component render with optional data
 */
export const logRender = (componentName: string, data?: any) => {
  if (!isDebugEnv) return;

  const message = `${DEBUG_PREFIX} ${RENDER_PREFIX} ${formatComponentName(componentName)}`;
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};

/**
 * Log state changes with before and after values
 */
export const logStateChange = (
  componentName: string,
  stateName: string,
  prevValue: any,
  newValue: any
) => {
  if (!isDebugEnv) return;

  console.log(
    `${DEBUG_PREFIX} ${STATE_PREFIX} ${formatComponentName(componentName)} - ${stateName}:`,
    '\nPrev:', prevValue,
    '\nNew:', newValue
  );
};

/**
 * Create a debug logger for a specific component
 */
export const createDebugger = (componentName: string) => {
  return {
    logRender: (data?: any) => logRender(componentName, data),
    logState: (stateName: string, prevValue: any, newValue: any) =>
      logStateChange(componentName, stateName, prevValue, newValue),
  };
}; 