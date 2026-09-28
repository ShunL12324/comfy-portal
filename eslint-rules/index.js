// Local plugin: design values reach components only through designTokens,
// useDesign() and the semantic Tailwind aliases.
module.exports = {
  meta: { name: 'tokens' },
  rules: {
    'no-literal-style-values': require('./no-literal-style-values'),
    'no-literal-colors': require('./no-literal-colors'),
    'no-raw-classes': require('./no-raw-classes'),
    'no-raw-font-size': require('./no-raw-font-size'),
    'no-raw-icon-size': require('./no-raw-icon-size'),
    'no-unmanaged-fonts': require('./no-unmanaged-fonts'),
  },
};
