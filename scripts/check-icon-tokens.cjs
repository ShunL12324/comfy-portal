const assert = require('node:assert/strict');
const path = require('node:path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const load = require('tailwindcss/loadConfig');
(async () => {
  const config = load(path.resolve('tailwind.config.js'));
  const { designTokens } = load(path.resolve('src/constants/design-tokens.ts'));
  config.content = [
    {
      raw: Object.keys(designTokens.icon)
        .map((k) => `size-icon-${k}`)
        .concat('gap-icon-label')
        .join(' '),
    },
  ];
  config.safelist = [];
  const result = await postcss([tailwind(config)]).process('@tailwind utilities;', { from: undefined });
  for (const [role, size] of Object.entries(designTokens.icon)) {
    const rule = result.root.nodes.find((n) => n.selector === `.size-icon-${role}`);
    assert.ok(rule, `Missing icon class ${role}`);
    for (const key of ['width', 'height']) assert.equal(rule.nodes.find((n) => n.prop === key)?.value, `${size}px`);
  }
  const gap = result.root.nodes.find((n) => n.selector === '.gap-icon-label');
  assert.equal(gap?.nodes.find((n) => n.prop === 'gap')?.value, `${designTokens.layout.iconLabel}px`);
  console.log('All icon utilities compile to their shared width and height tokens.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
