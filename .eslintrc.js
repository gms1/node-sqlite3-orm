module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: [
    'eslint-plugin-prefer-arrow',
    'eslint-plugin-import',
    'eslint-plugin-no-null',
    'eslint-plugin-jsdoc',
    '@typescript-eslint',
    '@delagen/deprecation',
  ],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-inferrable-types': 'off',
    'no-empty': 'off',
    '@delagen/deprecation/deprecation': 'warn',
  },
};
