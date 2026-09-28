// Colours come from useDesign() or a semantic token class. A literal colour
// bypasses the one token source and never follows the theme.
const { unwrap, staticString, keyName } = require('./utils');

const COLOR_KEY = /colou?rs?$|^(fill|stroke)$/i;
// Colour syntax and common CSS names. Other strings stay allowed: colour props
// on Gluestack components also take variant names (color="primary").
const COLOR_VALUE = /^\s*(#[0-9a-f]{3,8}|(rgb|hsl)a?\(|(black|white|red|green|blue|gr[ae]y|yellow|orange|purple|pink)\s*$)/i;

/** Colour literals that decide the value, including nested trackColor-style maps and gradient arrays. */
function colors(node) {
  node = unwrap(node);
  if (!node) return [];
  const text = staticString(node);
  if (text !== null) return COLOR_VALUE.test(text) ? [node] : [];
  if (node.type === 'ConditionalExpression') return [...colors(node.consequent), ...colors(node.alternate)];
  if (node.type === 'LogicalExpression') return [...colors(node.left), ...colors(node.right)];
  if (node.type === 'ArrayExpression') return node.elements.flatMap((element) => (element ? colors(element) : []));
  if (node.type === 'ObjectExpression') return node.properties.flatMap((p) => (p.type === 'Property' ? colors(p.value) : []));
  if (node.type === 'JSXExpressionContainer') return colors(node.expression);
  return [];
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow literal colours (hex, rgb(), hsl(), CSS names) in colour styles and props' },
    schema: [],
    messages: {
      literal: '`{{key}}` uses the literal colour {{value}}. Use a useDesign() colour (c.ink, c.muted, c.danger…) or a semantic class (text-content-*, bg-surface-*, border-stroke, status-*).',
    },
  },
  create(context) {
    const reported = new Set();
    const check = (key, value) => {
      if (!COLOR_KEY.test(key)) return;
      for (const literal of colors(value)) {
        if (reported.has(literal)) continue;
        reported.add(literal);
        context.report({ node: literal, messageId: 'literal', data: { key, value: context.sourceCode.getText(literal) } });
      }
    };
    return {
      Property(node) {
        const key = keyName(node);
        if (key) check(key, node.value);
      },
      JSXAttribute(node) {
        if (node.value && node.name.type === 'JSXIdentifier') check(node.name.name, node.value);
      },
    };
  },
};
