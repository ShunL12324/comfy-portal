// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const path = require('path');
const loadConfig = require('tailwindcss/loadConfig');
const resolveConfig = require('tailwindcss/resolveConfig');
const tokens = require('./eslint-rules');
// The spacing steps Tailwind actually generates from designTokens, loaded the
// way Tailwind loads its own config (which requires the TypeScript token file).
const spacingKeys = Object.keys(resolveConfig(loadConfig(path.join(__dirname, 'tailwind.config.js'))).theme.padding);
// The same loader reads the TypeScript token module that config requires.
const { designTokens } = loadConfig(path.join(__dirname, 'constants/design-tokens.ts'));
const heights = Object.values(designTokens.height);

// Design values come from designTokens, useDesign() and the semantic Tailwind
// aliases. The files that define those tokens, and tests, are the only places
// allowed to spell values out. Some entries sit outside the linted `files` and
// are listed only to declare the exemption.
const tokenExempt = [
  'constants/design-tokens.ts',
  'constants/Colors.ts',
  'components/ui/gluestack-ui-provider/**',
  'tailwind.config.js',
  '**/*.test.{ts,tsx}',
  '**/__tests__/**',
  'e2e/**',
];
// Type sizes are set only through these components' token-backed props.
const textComponents = ['Copy', 'Status', 'Text', 'Heading'];

module.exports = defineConfig([
  expoConfig,
  {
    // tools/ is gitignored scratch space and holds a Python virtualenv whose
    // vendored JS was being linted — nearly every problem `eslint .` reported
    // came from there, which buried the real ones.
    ignores: ["dist/*", "tools/**", "ios/**", "android/**", ".expo/**"],
  },
  {
    files: ['{app,components,features,hooks,utils}/**/*.{ts,tsx}'],
    ignores: tokenExempt,
    plugins: { tokens },
    rules: {
      'tokens/no-literal-style-values': ['error', { heights }],
      'tokens/no-literal-colors': 'error',
      'tokens/no-raw-classes': ['error', { spacingKeys }],
      'tokens/no-raw-font-size': ['error', { textComponents }],
      'tokens/no-raw-icon-size': 'error',
    },
  },
  {
    // Gluestack's generated components: numbered colour steps are the token
    // layer itself, and Tailwind's size scale will be generated from designTokens (T62).
    files: ['components/ui/*/**/*.{ts,tsx}', 'components/ui/*.tsx'],
    ignores: [...tokenExempt, 'components/ui/design-system/**'],
    rules: {
      'tokens/no-raw-classes': ['error', { allowScaleSteps: true, spacingKeys }],
      'tokens/no-raw-font-size': ['error', { textComponents, allowSizeClasses: true }],
    },
  },
  {
    files: ['{app,components,features,hooks,utils}/**/*.{ts,tsx}'],
    ignores: [
      ...tokenExempt,
      'components/ui/text/native-text.tsx',
      'components/self-ui/adaptive-sheet-components.tsx',
    ],
    rules: { 'tokens/no-unmanaged-fonts': 'error' },
  },
]);
