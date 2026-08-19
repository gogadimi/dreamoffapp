// ESLint 8 uses eslintrc by default; this file is .cjs because package.json
// declares "type": "module".
module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    plugins: ['@typescript-eslint', 'react-refresh'],
    settings: { react: { version: 'detect' } },
    ignorePatterns: ['dist', 'server/uploads', 'node_modules', '*.cjs'],
    rules: {
        // The new JSX transform makes both of these obsolete.
        'react/react-in-jsx-scope': 'off',
        'react/jsx-uses-react': 'off',
        // TypeScript already checks props; PropTypes would be duplicate work.
        'react/prop-types': 'off',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        // Deliberate `any` is still used at a few untyped boundaries
        // (Web Speech API, navigate params). Flag it, don't fail on it.
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-unused-vars': 'off'
    },
    overrides: [
        {
            // Server code is Node, not browser, and has its own tsconfig.
            files: ['server/**/*.ts'],
            env: { node: true, browser: false },
            extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
            rules: {
                'react/prop-types': 'off',
                '@typescript-eslint/no-explicit-any': 'warn',
                '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
            }
        }
    ]
};
