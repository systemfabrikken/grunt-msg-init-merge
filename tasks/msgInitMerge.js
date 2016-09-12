/*
 * grunt-msg-init-merge
 * https://github.com/kirill-zhirnov/grunt-msg-init-merge
 *
 * Copyright (c) 2015 Kirill Zhirnov
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path'),
	extend = require('extend'),
	async = require('async')
;

function objToCmdArgs(options)
{
	var out = [];
	Object.getOwnPropertyNames(options).forEach(function(key) {
		if (options[key] === true) {
			out.push('--' + key);
		} else if (options[key] !== false) {
			out.push('--' + key + '=' + options[key]);
		}
	});

	return out;
}

module.exports = function (grunt) {

	grunt.registerMultiTask('msgInitMerge', 'Grunt task for msginit and msgmerge', function () {
		//since grunt.registerMultiTask will parse the config-object and process the registerMultiTask expression
		// - which will cause an exception since 'locale' and 'potFileName' isnt defined, we register an alternative
		//delimiter pair that can be used in the poFilesPath expression
		grunt.template.addDelimiters('msginitmerge', '{%', '%}');
		var options = this.options({
			locales: [], // ['fr', {name:'ru_RU',folder:'ru'}]
			poFilesPath: '', //tpl for .po files, e.g.: i18n/<%= locale%>/<%= potFileName%>.po
			msgInit : {
				cmd : 'msginit',
				opts : {}
			},
			msgMerge : {
				cmd : 'msgmerge',
				opts : {}
			}
		});

		if (!Array.isArray(options.locales)) {
			grunt.fail.fatal('"locales" option must be an Array');
		}

		var poFilesPath = grunt.config.data.msgInitMerge[this.target].options.poFilesPath;
		if (!poFilesPath) {
			grunt.fail.fatal('"poFilesPath" option cannot be empty. For example: "i18n/<%= locale%>/<%= potFileName%>.po".');
		}

		var done = this.async(),
			asyncSpawns = []
		;

		options.locales.forEach(function (locale) {
			var localeName = locale,
				localeFolder = locale;

			if (locale instanceof Object) {
				localeName = locale.name;
				localeFolder = locale.folder;
			}


			this.filesSrc.forEach(function(filePath) {
				var potFileName = path.basename(filePath, path.extname(filePath)),
					potFilePath = path.resolve(filePath),
					poFilePath = grunt.template.process(poFilesPath, {
						data : {
							locale: localeFolder,
							potFileName: potFileName,
							potDirName: path.dirname(potFilePath)
						},
						delimiters: 'msginitmerge'
					});

				poFilePath = path.resolve(poFilePath);

				//if file exists - run msgmerge, else - msginit
				var spawnOptions;
				if (grunt.file.exists(poFilePath)) {
					var args = objToCmdArgs(extend(true, {
						'update' : true
					}, options.msgMerge.opts));

					args = args.concat([poFilePath, potFilePath]);

					spawnOptions = {
						cmd : options.msgMerge.cmd,
						args : args
					};
				} else {
					var dir = path.dirname(poFilePath);
					if (!grunt.file.isDir(dir)) {
						grunt.file.mkdir(dir);
					}

					spawnOptions = {
						cmd : options.msgInit.cmd,
						args : objToCmdArgs(extend(true, {
							'input' : potFilePath,
							'output-file' : poFilePath,
							'locale' : localeName
						}, options.msgInit.opts))
					};
				}

				asyncSpawns.push(spawnOptions);
			});
		}, this);

		async.eachSeries(asyncSpawns, function(spawnOptions, callback) {
			grunt.util.spawn(spawnOptions, function(error, result, code) {
				callback(error);
			});
		}, function(error) {
			done(error);
		});
	});
};