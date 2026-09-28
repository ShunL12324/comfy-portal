// Icon sizes come from designTokens.icon and strokes from iconStroke(size), so
// every icon keeps the same weight. An icon element is a Lucide import or any
// component named *Icon (Icon, InputIcon, CheckboxIcon, a local `const Icon =
// item.icon`); `iconSize` is the shared name for props that size an inner icon.
// strokeWidth is only used by icons, so a numeric one is flagged anywhere.
const { unwrap, literals, utility } = require('./utils');

const LUCIDE = /^(lucide-react-native|@\/constants\/icons)$/;
const SIZE_PROPS = new Set(['size', 'width', 'height']);
const SIZE_CLASS = /^-?(?:h|w|size|min-h|min-w|max-h|max-w)-/;

/** Static class text in a className value, including template and conditional branches. */
function classTexts(node) {
  node = unwrap(node);
  if (!node) return [];
  if (node.type === 'Literal' && typeof node.value === 'string') return [node.value];
  if (node.type === 'JSXExpressionContainer') return classTexts(node.expression);
  if (node.type === 'TemplateLiteral')
    return [...node.quasis.map((quasi) => quasi.value.cooked ?? ''), ...node.expressions.flatMap(classTexts)];
  if (node.type === 'ConditionalExpression') return [...classTexts(node.consequent), ...classTexts(node.alternate)];
  if (node.type === 'LogicalExpression') return [...classTexts(node.left), ...classTexts(node.right)];
  return [];
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow numeric icon sizes, stroke widths and class-sized icons' },
    schema: [],
    messages: {
      size: '`{{prop}}={{{value}}}` is a hard-coded icon size. Use t.icon.* (small, control, medium, large, hero, display).',
      stroke: '`strokeWidth={{{value}}}` is a hard-coded stroke. Use iconStroke(t.icon.*).',
      className: '`{{token}}` sizes an icon by class. Use the Icon size variant (xs … display) or t.icon.*.',
    },
  },
  create(context) {
    const lucide = new Set();
    const isIcon = (element) => element.type === 'JSXIdentifier' && (lucide.has(element.name) || /Icon$/.test(element.name));
    const report = (value, messageId, prop) => {
      for (const literal of literals(value)) context.report({ node: literal, messageId, data: { prop, value: literal.raw } });
    };
    return {
      ImportDeclaration(node) {
        if (!LUCIDE.test(node.source.value)) return;
        for (const specifier of node.specifiers) lucide.add(specifier.local.name);
      },
      JSXAttribute(node) {
        const prop = node.name.name;
        if (prop === 'strokeWidth') return report(node.value, 'stroke', prop);
        if (prop === 'iconSize') return report(node.value, 'size', prop);
        if (!isIcon(node.parent.name)) return;
        if (SIZE_PROPS.has(prop)) return report(node.value, 'size', prop);
        if (prop !== 'className') return;
        for (const text of classTexts(node.value))
          for (const token of text.split(/\s+/))
            if (token && SIZE_CLASS.test(utility(token))) context.report({ node: node.value, messageId: 'className', data: { token } });
      },
    };
  },
};
