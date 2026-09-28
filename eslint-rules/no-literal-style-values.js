// Radius, spacing and opacity come from designTokens, never from a number
// written at the call site. Keys are matched wherever they appear, so style
// objects built in variables, StyleSheet.create or animated styles are covered
// the same way as inline `style={{}}`. Type sizes have their own rule
// (no-raw-font-size). Dimensions are only held to the control heights: a
// width or height equal to a t.height value is that token written by hand.
const { literals, keyName } = require('./utils');

const TOKEN_KEYS = [
  [/^border\w*Radius$/, 'designTokens.radius (t.radius.*) or a rounded-* class', [0]],
  [/^(padding|margin)\w*$|^(gap|rowGap|columnGap)$/, 'designTokens.layout / designTokens.space (t.layout.*) or a p-*/m-*/gap-* class', [0]],
  [/^opacity$/, 't.opacity.* (pressed, disabled, scrim), usePressFeedback, or a colour role instead of a fade', [0, 1]],
];
const DIMENSION = /^(height|minHeight|width|minWidth)$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow numeric literals for radius, spacing, opacity and control heights' },
    schema: [
      {
        type: 'object',
        // The values of designTokens.height.
        properties: { heights: { type: 'array', items: { type: 'number' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      literal: '`{{key}}: {{value}}` is a hard-coded value. Use {{fix}}.',
      height: '`{{key}}: {{value}}` is a control height. Use t.height.* (small, control, touch).',
    },
  },
  create(context) {
    const heights = new Set(context.options[0]?.heights ?? []);
    return {
      Property(node) {
        const key = keyName(node);
        if (!key) return;
        if (DIMENSION.test(key)) {
          for (const literal of literals(node.value))
            if (heights.has(literal.value)) context.report({ node: literal, messageId: 'height', data: { key, value: literal.raw } });
          return;
        }
        const match = TOKEN_KEYS.find(([pattern]) => pattern.test(key));
        if (!match) return;
        for (const literal of literals(node.value)) {
          if (match[2].includes(literal.value)) continue;
          context.report({ node: literal, messageId: 'literal', data: { key, value: literal.raw, fix: match[1] } });
        }
      },
    };
  },
};
