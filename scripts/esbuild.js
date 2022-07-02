const esbuild = require('esbuild');

/** @type {esbuild.BuildOptions} */
const settingsBase = {
	entryPoints: [ 'index.js' ],
	bundle: true,
	outdir: 'dist',
	entryNames: 'tmi',
	target: 'es2018',
	format: 'iife',
	globalName: 'tmi',
};

/** @type {esbuild.BuildOptions} */
const settingsMinfiy = {
	minify: true,
	sourcemap: true,
	sourcesContent: false,
	entryNames: 'tmi.min',
	keepNames: true,
};

const args = process.argv.slice(2);

/** @type {esbuild.BuildOptions} */
const settings = args[0] === 'minify' ?
	{ ...settingsBase, ...settingsMinfiy } :
	settingsBase;

esbuild.build(settings)
.catch(() => process.exit(1));