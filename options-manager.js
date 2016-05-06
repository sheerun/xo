'use strict';
var path = require('path');
var arrify = require('./vendor/node_modules/arrify');
var pkgConf = require('./vendor/node_modules/pkg-conf');
var deepAssign = require('./vendor/node_modules/deep-assign');
var objectAssign = require('./vendor/node_modules/object-assign');
var homeOrTmp = require('./vendor/node_modules/home-or-tmp');
var multimatch = require('./vendor/node_modules/multimatch');
var resolveFrom = require('./vendor/node_modules/resolve-from');
var pathExists = require('./vendor/node_modules/path-exists');

var DEFAULT_IGNORE = [
'**/node_modules/**', 
'**/bower_components/**', 
'coverage/**', 
'{tmp,temp}/**', 
'**/*.min.js', 
'**/bundle.js', 
'fixture{-*,}.{js,jsx}', 
'fixture{s,}/**', 
'{test,tests,spec,__tests__}/fixture{s,}/**', 
'vendor/**', 
'dist/**'];


var DEFAULT_CONFIG = { 
	useEslintrc: false, 
	cache: true, 
	cacheLocation: path.join(homeOrTmp, '.xo-cache/'), 
	baseConfig: { 
		extends: [
		'xo', 
		path.join(__dirname, 'config/overrides.js'), 
		path.join(__dirname, 'config/plugins.js')] } };




function normalizeOpts(opts) {
	opts = objectAssign({}, opts);


	[
	'env', 
	'global', 
	'ignore', 
	'plugin', 
	'rule', 
	'extend'].
	forEach(function (singular) {
		var plural = singular + 's';
		var value = opts[plural] || opts[singular];

		delete opts[singular];

		if (value === undefined) {
			return;}


		if (singular !== 'rule') {
			value = arrify(value);}


		opts[plural] = value;});


	return opts;}


function mergeWithPkgConf(opts) {
	opts = objectAssign({ cwd: process.cwd() }, opts);

	return objectAssign({}, pkgConf.sync('xo', opts.cwd), opts);}


function buildConfig(opts) {
	var config = deepAssign({}, DEFAULT_CONFIG, { 
		envs: opts.envs, 
		globals: opts.globals, 
		plugins: opts.plugins || [], 
		rules: {}, 
		fix: opts.fix });


	if (opts.space) {
		var spaces = typeof opts.space === 'number' ? opts.space : 2;
		config.rules.indent = [2, spaces, { SwitchCase: 1 }];


		if (opts.cwd && resolveFrom(opts.cwd, 'eslint-plugin-react')) {
			config.plugins = config.plugins.concat('react');
			config.rules['react/jsx-indent-props'] = [2, spaces];
			config.rules['react/jsx-indent'] = [2, spaces];}}



	if (opts.semicolon === false) {
		config.rules.semi = [2, 'never'];
		config.rules['semi-spacing'] = [2, { before: false, after: true }];}


	if (opts.esnext) {
		config.baseConfig.extends = ['xo/esnext', path.join(__dirname, 'config/plugins.js')];}


	if (opts.rules) {
		objectAssign(config.rules, opts.rules);}


	if (opts.extends && opts.extends.length > 0) {


		var configs = opts.extends.map(function (name) {

			if (pathExists.sync(name)) {
				return name;}


			if (name.indexOf('eslint-config-') === -1) {
				name = 'eslint-config-' + name;}


			return resolveFrom(opts.cwd, name);});


		config.baseConfig.extends = config.baseConfig.extends.concat(configs);}


	return config;}






function findApplicableOverrides(path, overrides) {
	var hash = 0;
	var applicable = [];

	overrides.forEach(function (override) {
		hash <<= 1;

		if (multimatch(path, override.files).length > 0) {
			applicable.push(override);
			hash |= 1;}});



	return { 
		hash: hash, 
		applicable: applicable };}




function groupConfigs(paths, baseOptions, overrides) {
	var map = {};
	var arr = [];

	paths.forEach(function (x) {
		var data = findApplicableOverrides(x, overrides);

		if (!map[data.hash]) {
			var mergedOpts = deepAssign.apply(null, [{}, baseOptions].concat(data.applicable));
			delete mergedOpts.files;

			arr.push(map[data.hash] = { 
				opts: mergedOpts, 
				paths: [] });}



		map[data.hash].paths.push(x);});


	return arr;}


function preprocess(opts) {
	opts = mergeWithPkgConf(opts);
	opts = normalizeOpts(opts);
	opts.ignores = DEFAULT_IGNORE.concat(opts.ignores || []);
	return opts;}


exports.DEFAULT_IGNORE = DEFAULT_IGNORE;
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
exports.mergeWithPkgConf = mergeWithPkgConf;
exports.normalizeOpts = normalizeOpts;
exports.buildConfig = buildConfig;
exports.findApplicableOverrides = findApplicableOverrides;
exports.groupConfigs = groupConfigs;
exports.preprocess = preprocess;