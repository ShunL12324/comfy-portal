/** Strip TypeScript-only wrappers (`as const`, `satisfies`, `!`) around an expression. */
function unwrap(node) {
  while (node && /^TS(As|Satisfies|NonNull)Expression$|^TSTypeAssertion$/.test(node.type)) node = node.expression;
  return node;
}

/** Static text of a string literal or an expression-free template literal, else null. */
function staticString(node) {
  node = unwrap(node);
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  return null;
}

const isNumber = (node) => node.type === 'Literal' && typeof node.value === 'number';

/**
 * Numeric literals that decide a value. A factor in `*` or `/` scales a token
 * (`t.layout.field * 2`) and is allowed, unless both sides are literals.
 */
function literals(node) {
  node = unwrap(node);
  if (!node) return [];
  if (isNumber(node)) return [node];
  if (node.type === 'JSXExpressionContainer') return literals(node.expression);
  if (node.type === 'UnaryExpression' && node.operator === '-') return literals(node.argument);
  if (node.type === 'ConditionalExpression') return [...literals(node.consequent), ...literals(node.alternate)];
  if (node.type === 'LogicalExpression') return [...literals(node.left), ...literals(node.right)];
  if (node.type === 'BinaryExpression' && (node.operator === '+' || node.operator === '-'))
    return [...literals(node.left), ...literals(node.right)];
  if (node.type === 'BinaryExpression' && (node.operator === '*' || node.operator === '/'))
    return isNumber(unwrap(node.left)) && isNumber(unwrap(node.right)) ? [unwrap(node.left), unwrap(node.right)] : [];
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.name === 'Math' &&
    ['max', 'min'].includes(node.callee.property.name)
  )
    return node.arguments.flatMap(literals);
  return [];
}

/** Name of a non-computed object key, else null. */
function keyName(property) {
  if (property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  return typeof property.key.value === 'string' ? property.key.value : null;
}

/** The utility itself, without variants (`dark:`, `data-[x=y]:`) or the `!` modifier. */
function utility(token) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    if (token[i] === '[') depth++;
    else if (token[i] === ']') depth--;
    else if (token[i] === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!/, '');
}

/**
 * Visitors that hand every whitespace-separated token of every string to
 * `check(node, token, utility)`. Scanning all strings covers classes assembled
 * in helpers, cn() or tva() the same way as a literal className.
 */
function classVisitors(check) {
  const scan = (node, text) => {
    for (const token of text.split(/\s+/)) if (token) check(node, token, utility(token));
  };
  return {
    Literal(node) {
      if (typeof node.value === 'string') scan(node, node.value);
    },
    TemplateElement(node) {
      scan(node, node.value.cooked ?? '');
    },
  };
}

module.exports = { unwrap, staticString, literals, keyName, classVisitors, utility };
