import react from 'eslint-plugin-react';

import pluginJs from '@eslint/js';
import pluginJest from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

const ignores = [
  'node_modules/**',
  'coverage/**',
  'scripts/**',
  'web/**',
  'staged-themes/**',
  '.prettierrc.js',
  'eslint.config.mjs',
  'dist/**',
  'jest.config.js',
  'ecosystem.config.js',
];

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],

  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  {
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'react/no-unknown-property': 'off',
      'react/jsx-no-target-blank': 'off',
    },
  },
  { ignores },
  {
    files: [
      'test/**/*',
      'tests/**/*',
      '*/testing/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    }
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: { '@typescript-eslint/no-floating-promises': 'error', },
  },
];