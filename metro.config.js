const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix web compatibility issues
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Fix tslib ESM/CJS interop issue (framer-motion via moti)
    if (moduleName === 'tslib') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/tslib/tslib.js'),
        type: 'sourceFile',
      };
    }

    // Force zustand to use CJS build on web to avoid import.meta.env in ESM build
    if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
      const subpath = moduleName === 'zustand' ? 'index.js' : moduleName.replace('zustand/', '') + '.js';
      const filePath = path.resolve(__dirname, 'node_modules/zustand', subpath);
      return {
        filePath,
        type: 'sourceFile',
      };
    }

    // Replace @gorhom/bottom-sheet with web shim (BottomSheetTextInput crashes on web)
    // Skip if the import originates from our shim to avoid circular resolution
    if (moduleName === '@gorhom/bottom-sheet' && !context.originModulePath?.includes('shims/')) {
      return {
        filePath: path.resolve(__dirname, 'shims/gorhom-bottom-sheet.web.ts'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
