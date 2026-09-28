// Type sizes come from designTokens.type (title, section, body, label,
// metadata, micro). A size can be written three ways, and all three are held
// to the same scale: a fontSize/lineHeight style value, a literal `size` on a
// text component, and a Tailwind text size class, whose scale (text-2xs,
// text-xs … text-9xl) is not our type scale.
const { unwrap, literals, keyName, classVisitors } = require('./utils');

const STYLE_KEYS = /^(fontSize|lineHeight)$/;
/** Tailwind's size names; design type names (`size="body"`) stay allowed. */
const SCALE_NAME = /^(?:2xs|xs|sm|md|base|lg|[2-9]?xl)$/;

/** Literal sizes a text component is given: any number (`size={16}`) or a Tailwind scale name (`size="sm"`). */
function sizes(node) {
  node = unwrap(node);
  if (!node) return [];
  if (node.type === 'Literal' && typeof node.value === 'string') return SCALE_NAME.test(node.value) ? [node] : [];
  if (node.type === 'JSXExpressionContainer') return sizes(node.expression);
  if (node.type === 'ConditionalExpression') return [...sizes(node.consequent), ...sizes(node.alternate)];
  if (node.type === 'LogicalExpression') return [...sizes(node.left), ...sizes(node.right)];
  return literals(node);
}

const SIZE_CLASS = /^text-(?:2xs|xs|sm|base|lg|[2-9]?xl)$/;
const ARBITRARY_CLASS = /^(?:text-\[(?!#|rgba?\()[^\]]+\]|leading-\[[^\]]+\])$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow type sizes outside designTokens.type' },
    schema: [
      {
        type: 'object',
        properties: {
          textComponents: { type: 'array', items: { type: 'string' } },
          // Gluestack's generated components keep the size classes; the Tailwind scale is generated from the tokens.
          allowSizeClasses: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      style: '`{{key}}: {{value}}` is a hard-coded type size. Use t.type.* (title, section, body, label, metadata, micro) or the Copy/Title primitives.',
      prop: '`<{{component}} size={{value}}>` sets its own type size. Use Copy/Title with a design type size (title, section, body, label, metadata, micro).',
      className: '`{{token}}` is Tailwind\'s type scale, not ours. Use Copy/Title with t.type.* sizes.',
      arbitrary: '`{{token}}` is an arbitrary type size. Use Copy/Title with t.type.* sizes.',
    },
  },
  create(context) {
    const { textComponents = [], allowSizeClasses = false } = context.options[0] ?? {};
    const components = new Set(textComponents);
    return {
      Property(node) {
        const key = keyName(node);
        if (!key || !STYLE_KEYS.test(key)) return;
        for (const literal of literals(node.value))
          if (literal.value !== 0) context.report({ node: literal, messageId: 'style', data: { key, value: literal.raw } });
      },
      JSXAttribute(node) {
        const element = node.parent.name;
        if (node.name.name !== 'size' || element.type !== 'JSXIdentifier' || !components.has(element.name)) return;
        for (const literal of sizes(node.value))
          context.report({ node: literal, messageId: 'prop', data: { component: element.name, value: literal.raw } });
      },
      ...classVisitors((node, token, name) => {
        if (ARBITRARY_CLASS.test(name)) context.report({ node, messageId: 'arbitrary', data: { token } });
        else if (SIZE_CLASS.test(name) && !allowSizeClasses) context.report({ node, messageId: 'className', data: { token } });
      }),
    };
  },
};
