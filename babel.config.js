module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
        },
      ],
      'nativewind/babel',
    ],

    plugins: [
      // react-stately (pulled in by @gluestack-ui/utils) ships static class
      // blocks in its .mjs build, which babel-preset-expo doesn't enable for
      // the Hermes target. Without this the iOS bundle fails to build at all.
      '@babel/plugin-transform-class-static-block',
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            '@': './',
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
