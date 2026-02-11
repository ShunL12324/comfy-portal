const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ──────────────────────────────────────────────────────────────
// Web-only module resolution hacks
// These overrides only apply when platform === 'web' and fix
// issues that arise from bundling React Native code for the browser.
// ──────────────────────────────────────────────────────────────
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {

    // ── 1. tslib ESM/CJS interop ──────────────────────────────
    // framer-motion (pulled in via moti) imports tslib's ESM entry
    // which Metro can't resolve correctly. Force the CJS build.
    if (moduleName === 'tslib') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/tslib/tslib.js'),
        type: 'sourceFile',
      };
    }

    // ── 2. zustand ESM import.meta.env issue ──────────────────
    // zustand's ESM build uses import.meta.env which Metro doesn't
    // support. Force the CJS build for zustand and its sub-paths.
    if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
      const subpath = moduleName === 'zustand' ? 'index.js' : moduleName.replace('zustand/', '') + '.js';
      const filePath = path.resolve(__dirname, 'node_modules/zustand', subpath);
      return {
        filePath,
        type: 'sourceFile',
      };
    }

    // ── 3. @gorhom/bottom-sheet web shim ──────────────────────
    // BottomSheetTextInput and other internals crash on web.
    // Redirect to our lightweight shim that re-exports only the
    // components we actually use. Skip if the import originates
    // from the shim itself to avoid circular resolution.
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
