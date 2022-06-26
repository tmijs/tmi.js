const esbuild = require('esbuild');

const settingsBase = {
	entryPoints: [ 'index.js' ],
	bundle: true,
	outdir: 'dist',
	entryNames: 'tmi',
	target: 'es2018',
};

const settingsMinfiy = {
	minify: true,
	sourcemap: true,
	sourcesContent: false,
	entryNames: 'tmi.min',
};

const args = process.argv.slice(2);

const settings =  args[0] === 'minify' ?
	{ ...settingsBase, ...settingsMinfiy } :
	settingsBase;

esbuild.build(settings)
.catch(() => process.exit(1));