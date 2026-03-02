import typescriptEslint from '@typescript-eslint/eslint-plugin'
import _import from 'eslint-plugin-import'
import react from 'eslint-plugin-react'
import { fixupPluginRules } from '@eslint/compat'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'prettier',
  ),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: fixupPluginRules(_import),
      react,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'commonjs',

      parserOptions: {
        project: ['tsconfig.json'],
      },
    },

    settings: {
      react: {
        pragma: 'h',
        version: '16.8',
      },
    },

    rules: {
      'no-duplicate-imports': 'error',
      'no-unused-vars': 'off',
      'no-console': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-parameter-properties': 'off',
      '@typescript-eslint/no-this-alias': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          classes: false,
          functions: false,
          typedefs: false,
        },
      ],

      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      'import/export': 'error',

      'import/extensions': [
        'error',
        'never',
        {
          json: 'always',
        },
      ],

      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-absolute-path': 'error',
      'import/no-commonjs': 'error',
      'import/no-cycle': 'error',
      'import/no-default-export': 'error',
      'import/prefer-default-export': 'off',
      'import/no-deprecated': 'error',

      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '__stories__/**/*',
            '__tests-pacts__/**/*',
            '__tests__/**/*',
            'scripts/**/*',
            'jest.setup.ts',
            'webpack.config.js',
          ],

          optionalDependencies: false,
        },
      ],

      'import/no-internal-modules': [
        'error',
        {
          allow: ['msw/node'],
        },
      ],

      'import/no-mutable-exports': 'error',
      'import/no-self-import': 'error',
      'import/no-unassigned-import': 'error',

      'import/no-useless-path-segments': [
        'error',
        {
          noUselessIndex: true,
        },
      ],

      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
          },

          groups: [
            ['builtin', 'external', 'internal'],
            ['parent', 'sibling', 'index', 'unknown'],
          ],

          'newlines-between': 'always',
        },
      ],

      'react/jsx-boolean-value': 'error',
      'react/jsx-curly-brace-presence': 'error',
      'react/jsx-fragments': ['error', 'syntax'],
      'react/prop-types': 'off',
    },
  },
]
