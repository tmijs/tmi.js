import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import inject from 'rollup-plugin-inject';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';
import uglify from 'rollup-plugin-uglify';

const processShim = '\0process-shim';

const prod = process.env.PRODUCTION;
const mode = prod ? 'production' : 'development';

const path = require('path');

console.log(`Creating ${mode} bundle...`);

const targets = prod
    ? [{ dest: 'build/tmi.min.js', format: 'umd' }]
    : [
          { dest: 'build/tmi.js', format: 'umd' },
          { dest: 'build/tmi.es.js', format: 'es' },
      ];

const plugins = [
    // Unlike Webpack and Browserify, Rollup doesn't automatically shim Node
    // builtins like `process`. This ad-hoc plugin creates a 'virtual module'
    // which includes a shim containing just the parts the bundle needs.
    {
        resolveId(importee) {
            if (importee === processShim) return importee;
            return null;
        },
        load(id) {
            if (id === processShim)
                return 'export default { argv: [], env: {} }';
            return null;
        },
    },
    nodeResolve({
        browser: true,
    }),
    commonjs(),
    replace({
        'process.env.NODE_ENV': JSON.stringify(
            prod ? 'production' : 'development'
        ),
    }),
    inject({
        process: processShim,
    }),
    babel({
        babelrc: false,
        presets: [
            [
                'env',
                {
                    loose: true,
                    modules: false,
                },
            ],
        ],
        plugins: [
            'external-helpers',
            'transform-object-rest-spread',
            'transform-class-properties',
        ],
    }),
    json(),
];

if (prod) plugins.push(uglify());

export default {
    entry: 'index.js',
    moduleName: 'tmi.js',
    exports: 'named',
    external: ['request', 'ws'],
    targets,
    plugins,
};
