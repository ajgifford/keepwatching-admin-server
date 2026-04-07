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

  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { ignores },
  {
    files: ['tests/**/*', '**/*.test.ts', '**/*.spec.ts'],
    plugins: { jest: pluginJest },
    languageOptions: { globals: pluginJest.environments.globals.globals },
    ...pluginJest.configs['flat/recommended'],
  },
  {
    files: ['tests/**/*', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
