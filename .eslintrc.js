module.exports = {
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script',
        ecmaFeatures: {}
    },
    extends: 'eslint:recommended',
    rules: {
        // Add rules:
        semi: 'error',
        indent: [ 'error', 'tab', { MemberExpression: 0, SwitchCase: 1 } ],
        'array-bracket-spacing': [ 'error', 'always' ],
        'object-curly-spacing': [ 'error', 'always' ],
        'comma-dangle': [ 'error', 'never' ],
        'comma-spacing': 'error',
        'max-depth': [ 'error', 3 ],
        yoda: 'error',
        quotes: [ 'error', 'single' ],
        'brace-style': [ 'error', 'stroustrup' ],
        curly: [ 'error', 'all' ],
        eqeqeq: 'error',
        'no-var': 'error',
        'padding-line-between-statements': [
            'error',
            { blankLine: 'never', prev: '*', next: 'break' },
            { blankLine: 'never', prev: '*', next: 'return' }
        ],
        'prefer-const': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',
        'prefer-spread': 'error',
        'prefer-destructuring': 'error',
        'template-curly-spacing': [ 'error', 'never' ],
        'space-infix-ops': 'error',
        'padded-blocks': [ 'error', 'never' ],
        'arrow-body-style': [ 'error', 'as-needed' ],
        'arrow-parens': [ 'error', 'as-needed' ],
        'quote-props': [ 'error', 'as-needed', { numbers: true } ],
        'eol-last': 'error',
        'multiline-ternary': [ 'error', 'never' ],
        'no-unneeded-ternary': 'error',
        'no-nested-ternary': 'off',
        'keyword-spacing': [
            'error',
            {
                overrides: {
                    if: { after: false },
                    for: { after: false },
                    while: { after: false },
                    catch: { after: false },
                    switch: { after: false }
                }
            }
        ],
        'space-before-function-paren': [
            'error',
            {
                anonymous: 'never',
                named: 'never',
                asyncArrow: 'never'
            }
        ],

        // Alter rules:
        'no-empty': [ 'error', { allowEmptyCatch: true } ],
        'no-unused-vars': [ 'error', { args: 'after-used', argsIgnorePattern: '^_' } ]

        // Disable rules:
    },
    env: {
        node: true,
        browser: true,
        commonjs: true,
        es6: true,
        es2017: true,
        mocha: true
    }
}