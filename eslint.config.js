import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@stylistic': stylistic, '@typescript-eslint': tsPlugin },
    rules: {
      ...stylistic.configs.customize({ quotes: 'single',
        semi: true,
        braceStyle: '1tbs' }).rules,
      'curly': ['error', 'multi-line'],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/max-len': ['warn', { code: 110,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true }],
      '@stylistic/object-curly-newline': ['warn', { multiline: true, consistent: true }],
      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@typescript-eslint/no-require-imports': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'babel.config.cjs'],
  },
];
