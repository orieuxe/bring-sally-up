import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';

export default [
  js.configs.recommended,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      ...stylistic.configs.customize({ quotes: 'single', semi: true, braceStyle: '1tbs' }).rules,
      'curly': ['error', 'multi-line'],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      'max-len': ['warn', { code: 110 }],
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'babel.config.cjs'],
  },
];
