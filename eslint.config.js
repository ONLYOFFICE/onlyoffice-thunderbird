export default [
    {
        ignores: [
            'build/',
            'config/',
            'vendor/'
        ]
    },
    {
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 'latest',
            globals: {
                browser: 'readonly',
                messenger: 'readonly',
                console: 'readonly'
            }
        },
        rules: {
            'indent': ['error', 4],
            'max-len': ['error', { 'code': 120, 'ignoreUrls': true, 'ignoreStrings': true }],
            'linebreak-style': ['error', 'unix'],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off'
        }
    }
];
