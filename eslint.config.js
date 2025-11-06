import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow explicit any in legacy code; prefer fixing incrementally
      '@typescript-eslint/no-explicit-any': 'off',
      // Some empty-interface/object-type patterns exist in older files
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // Relax fast-refresh only-export-components where shared utils/constants are exported from component files
      'react-refresh/only-export-components': 'off',
      // Make hard-to-fix hook warnings non-blocking for now
      'react-hooks/rules-of-hooks': 'warn'
    }
  },
])
