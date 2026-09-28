const { keyName, literals, classVisitors } = require('./utils');

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep application text and inputs on the shared font adapters' },
    schema: [],
    messages: {
      primitive: 'Use the shared Text/Copy or AdaptiveTextInput/SheetAwareTextInput so the font is managed on every platform.',
      family: 'Use designTokens.font.* rather than a literal font family.',
      legacy: 'This font utility has no registered design-system face.',
    },
  },
  create(context) {
    const namespaces = new Set();
    return {
      ImportDeclaration(node) {
        if (!['react-native', '@gorhom/bottom-sheet'].includes(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (specifier.importKind === 'type' || node.importKind === 'type') continue;
          if (specifier.type === 'ImportNamespaceSpecifier') namespaces.add(specifier.local.name);
          if (specifier.type === 'ImportSpecifier' && ['Text', 'TextInput', 'BottomSheetTextInput'].includes(specifier.imported.name))
            context.report({ node: specifier, messageId: 'primitive' });
        }
      },
      MemberExpression(node) {
        if (node.object.type === 'Identifier' && namespaces.has(node.object.name) &&
          node.property.type === 'Identifier' && ['Text', 'TextInput', 'BottomSheetTextInput'].includes(node.property.name))
          context.report({ node, messageId: 'primitive' });
      },
      Property(node) {
        if (keyName(node) !== 'fontFamily') return;
        for (const literal of literals(node.value)) context.report({ node: literal, messageId: 'family' });
      },
      ...classVisitors((node, token, name) => {
        if (/^font-(roboto|poppins|lato|extrablack)$/.test(name)) context.report({ node, messageId: 'legacy' });
      }),
    };
  },
};
