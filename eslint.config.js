import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Lean flat config for this Preact userscript. The previous config was a generic
// Vite+React template (react-hooks / react-refresh plugins) that doesn't apply here and
// imported undeclared packages; @pionxzh/eslint-config@2 predates eslint 10 (incompatible).
// This keeps the meaningful JS + TypeScript checks; genuinely-dead code was fixed at the
// source, and only stylistic / new-rule noise is tuned down to warnings.
export default tseslint.config(
    { ignores: ['dist', 'dist-site', 'node_modules', '**/*.user.js', 'scripts/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            globals: { ...globals.browser, ...globals.greasemonkey, ...globals.node },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-empty-object-type': 'warn',
            'no-unused-vars': 'off',
            'no-useless-assignment': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }],
        },
    },
)
