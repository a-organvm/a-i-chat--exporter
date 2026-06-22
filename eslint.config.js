import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Lean flat config for this Preact userscript. The old generic React template
// imported undeclared packages and the unused @pionxzh config is not ESLint 10 ready.
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
            '@typescript-eslint/no-empty-object-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-unused-vars': 'off',
            'no-useless-assignment': 'warn',
        },
    },
)
