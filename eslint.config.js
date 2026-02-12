import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Keep this plugin lean; avoid style rules here (Prettier handles formatting).
    },
  },

  // Turn off rules that conflict with Prettier.
  prettier,

  // Enforce optional-braces/parentheses rules AFTER Prettier config.
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // Require braces for all control statements (no single-line implicit bodies).
      curly: ['error', 'all'],

      // Require parentheses for arrow function parameters: (x) => x
      'arrow-parens': ['error', 'always'],
    },
  },
];
