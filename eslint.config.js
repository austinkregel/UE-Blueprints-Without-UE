import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config. Anti-slop posture: dead code (unused imports/vars/components),
// undefined references, loose equality, and empty blocks are ERRORS.
// Formatting is delegated entirely to Prettier (eslint-config-prettier turns
// off any stylistic rules that would fight it).
export default [
    {
        ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'src-tauri/**', 'public/**', 'parsed_code_php.json']
    },

    js.configs.recommended,
    ...vue.configs['flat/recommended'],

    {
        files: ['**/*.{js,mjs,vue}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            'unused-imports': unusedImports
        },
        rules: {
            // --- dead-code (autofixable) ---
            // Disable the base rule in favor of the plugin, which can strip
            // unused imports automatically via `eslint --fix`.
            'no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_'
                }
            ],

            // Single-word component names (Type, Line, …) are intentional here.
            'vue/multi-word-component-names': 'off',

            // --- correctness ---
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-var': 'error',
            'prefer-const': 'error',

            // Noisy but not slop: leftover debugging output. Warn so it surfaces
            // in review without blocking; console.warn/error are allowed.
            'no-console': ['warn', { allow: ['warn', 'error'] }]
        }
    },

    {
        files: ['**/__tests__/**', '**/*.spec.js', '**/*.test.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                vi: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly'
            }
        },
        rules: {
            'no-console': 'off'
        }
    },

    // Must stay last: strip formatting rules that overlap with Prettier.
    prettier
];
