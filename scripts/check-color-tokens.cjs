const assert = require('node:assert/strict');
const path = require('node:path');
const load = require('tailwindcss/loadConfig');
const { designColors } = load(path.resolve(__dirname, '../constants/design-tokens.ts'));

function luminance(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const surfaces = ['paper', 'card', 'well', 'overlay', 'raised', 'workspace', 'workspaceCard'];
const textRoles = ['ink', 'secondary', 'muted'];
for (const [mode, colors] of Object.entries(designColors)) {
  const neutral = [
    ...surfaces,
    ...textRoles,
    'line',
    'subtle',
    'boundary',
    'solid',
    'onSolid',
    'tint',
    'onTint',
    'tintSurface',
  ];
  for (const role of neutral) {
    const rgb = colors[role].slice(1).match(/../g);
    assert.equal(new Set(rgb).size, 1, `${mode}.${role} has an unintended hue`);
  }
  let weakest = Infinity;
  for (const surface of surfaces) {
    for (const role of textRoles) {
      const ratio = contrast(colors[role], colors[surface]);
      assert.ok(ratio >= 4.5, `${mode}.${role} on ${surface}: ${ratio}`);
      weakest = Math.min(weakest, ratio);
    }
    assert.ok(contrast(colors.boundary, colors[surface]) >= 3, `${mode}: control boundary on ${surface}`);
    for (const role of ['ready', 'danger', 'warning']) {
      assert.ok(contrast(colors[role], colors[surface]) >= 4.5, `${mode}.${role} on ${surface}`);
    }
  }
  for (const [foreground, background] of [
    ['onSolid', 'solid'],
    ['onDanger', 'dangerSolid'],
    ['onWarning', 'warning'],
  ]) {
    assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${mode}.${foreground} on ${background}`);
  }
  assert.equal(colors.tint, colors.solid);
  assert.equal(colors.onTint, colors.onSolid);
  assert.equal(colors.tintSurface, colors.raised);
  if (mode === 'dark') {
    const elevations = ['paper', 'well', 'card', 'overlay', 'raised'].map((key) => luminance(colors[key]));
    assert.ok(
      elevations.every((value, i) => i === 0 || value > elevations[i - 1]),
      'Dark layer ordering',
    );
  } else {
    assert.ok(luminance(colors.card) > luminance(colors.paper), 'Light cards above canvas');
    assert.ok(luminance(colors.well) < luminance(colors.paper), 'Light fields inset into canvas');
  }
  console.log(
    `${mode}: ${surfaces.length * textRoles.length} neutral text/surface pairs >= 4.5:1 (minimum ${weakest.toFixed(2)}:1); control boundaries >= 3:1; semantic states and button labels pass.`,
  );
}
