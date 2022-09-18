const ERROR = 'error';
const ALWAYS = 'always';
const NEVER = 'never';

/** @type {import('eslint').Linter.Config} */
module.exports = {
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'script',
		ecmaFeatures: {},
	},
	env: {
		node: true,
		browser: true,
		commonjs: true,
		es6: true,
		es2020: true,
		mocha: true
	},
	extends: 'eslint:recommended',
	rules: {
		// Add rules:
		semi: ERROR,
		indent: [ ERROR, 'tab', { MemberExpression: 0, SwitchCase: 1 } ],
		'array-bracket-spacing': [ ERROR, ALWAYS ],
		'object-curly-spacing': [ ERROR, ALWAYS ],
		'comma-dangle': [ ERROR, NEVER ],
		'comma-spacing': ERROR,
		'max-depth': [ ERROR, 3 ],
		yoda: ERROR,
		quotes: [ ERROR, 'single' ],
		'brace-style': [ ERROR, 'stroustrup' ],
		curly: [ ERROR, 'all' ],
		eqeqeq: ERROR,
		'no-var': ERROR,
		'one-var': [ ERROR, NEVER ],
		'padding-line-between-statements': [
			ERROR,
			{ blankLine: NEVER, prev: '*', next: 'break' },
			{ blankLine: NEVER, prev: '*', next: 'return' }
		],
		'prefer-const': ERROR,
		'prefer-arrow-callback': ERROR,
		'prefer-template': ERROR,
		'prefer-spread': ERROR,
		'prefer-destructuring': ERROR,
		'template-curly-spacing': [ ERROR, NEVER ],
		'space-infix-ops': ERROR,
		'padded-blocks': [ ERROR, NEVER ],
		'arrow-body-style': [ ERROR, 'as-needed' ],
		'arrow-parens': [ ERROR, 'as-needed' ],
		'quote-props': [ ERROR, 'as-needed', { numbers: true } ],
		'eol-last': ERROR,
		'multiline-ternary': [ ERROR, NEVER ],
		'no-unneeded-ternary': ERROR,
		'no-nested-ternary': 'off',
		'keyword-spacing': [
			ERROR,
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
			ERROR,
			{
				anonymous: NEVER,
				named: NEVER,
				asyncArrow: ALWAYS
			}
		],
		'no-multiple-empty-lines': ERROR,

		// Alter rules:
		'no-empty': [ ERROR, { allowEmptyCatch: true } ],
		'no-unused-vars': [ ERROR, { args: 'after-used', argsIgnorePattern: '^_' } ]

		// Disable rules:
	}
}