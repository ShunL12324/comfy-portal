// Class names reach the theme only through the semantic aliases in
// tailwind.config.js (content-*, surface-*, stroke, ink, paper, well, action,
// status-*) and the spacing/radius scales. Arbitrary values, Tailwind's
// built-in hues and Gluestack's numbered steps all bypass that layer.
// Type size classes have their own rule (no-raw-font-size).
const { classVisitors } = require('./utils');

const COLOR_UTILITY = '(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|divide|outline|shadow|placeholder|from|via|to|decoration|accent|caret)';
const OPACITY = '(?:/\\d+)?';
const HUES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const SCALES = 'primary|secondary|tertiary|error|success|warning|info|typography|outline|background|indicator';
const STEP = '(?:50|[1-9]00|950)';

/** Padding, margin, gap and space utilities (and their negatives) split into prefix and key. */
const SPACING = /^-?(p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy])-([^[\]]+)$/;
/** Keywords that are not spacing steps (`safe` is NativeWind's safe-area inset). */
const SPACING_WORDS = { p: ['safe'], m: ['auto', 'safe'], space: ['reverse'] };

const CHECKS = [
  [/^(?:rounded(?:-[trblse]{1,2})?|-?[pm][trblxyse]?|gap(?:-[xy])?|-?space-[xy])-\[[^\]]+\]$/, 'arbitrary'],
  [/^[\w-]+-\[(?:#|rgba?\()[^\]]*\]$/, 'arbitrary'],
  [new RegExp(`^${COLOR_UTILITY}-(?:(?:${HUES})-${STEP}|black|white)${OPACITY}$`), 'palette'],
  [/^opacity-(?!0$|100$)(?:\d+(?:\.\d+)?|\[[^\]]+\])$/, 'opacity'],
  [new RegExp(`^${COLOR_UTILITY}-(?:${SCALES})-(?:0|${STEP})${OPACITY}$`), 'scale'],
];

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow arbitrary values, built-in hues and numbered Gluestack steps in class names' },
    schema: [
      {
        type: 'object',
        properties: {
          // Gluestack's generated components consume the numbered steps as the token layer itself.
          allowScaleSteps: { type: 'boolean' },
          // Keys of the generated spacing scale; any other padding/margin/gap/space key has no value.
          spacingKeys: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitrary: '`{{token}}` is an arbitrary value. Use a scale class (rounded-*, p-*/m-*/gap-*) or a semantic colour class.',
      palette: '`{{token}}` is a built-in Tailwind colour. Use a semantic colour class (text-content-*, bg-surface-*, border-stroke, status-*).',
      opacity: '`{{token}}` is a numeric opacity. Use opacity-pressed, opacity-disabled or opacity-scrim (t.opacity).',
      spacing: '`{{token}}` is not on the spacing scale, so it has no value. Use one of: {{keys}}.',
      scale: '`{{token}}` is a numbered Gluestack step. Use the semantic alias for its role (text-content-*, bg-surface-*, bg-paper/well, border-stroke*, bg-action, text-status-*).',
    },
  },
  create(context) {
    const { allowScaleSteps = false, spacingKeys } = context.options[0] ?? {};
    const keys = spacingKeys && new Set(spacingKeys);
    return classVisitors((node, token, name) => {
      const spacing = keys && SPACING.exec(name);
      if (spacing) {
        const [, prefix, key] = spacing;
        const words = SPACING_WORDS[prefix.startsWith('space') ? 'space' : prefix[0]] ?? [];
        if (!keys.has(key) && !words.includes(key))
          context.report({ node, messageId: 'spacing', data: { token, keys: [...keys].join(', ') } });
        return;
      }
      const check = CHECKS.find(([pattern]) => pattern.test(name));
      if (check && !(allowScaleSteps && check[1] === 'scale')) context.report({ node, messageId: check[1], data: { token } });
    });
  },
};
