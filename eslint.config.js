// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // tools/ is gitignored scratch space and holds a Python virtualenv whose
    // vendored JS was being linted — nearly every problem `eslint .` reported
    // came from there, which buried the real ones.
    ignores: ["dist/*", "tools/**", "ios/**", "android/**", ".expo/**"],
  }
]);
