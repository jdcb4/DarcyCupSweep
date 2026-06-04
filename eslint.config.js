import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error'
    }
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        CSS: 'readonly',
        Date: 'readonly',
        document: 'readonly',
        FormData: 'readonly',
        fetch: 'readonly',
        globalThis: 'readonly',
        Intl: 'readonly',
        Error: 'readonly',
        Number: 'readonly',
        setInterval: 'readonly'
      }
    }
  },
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**']
  }
);
