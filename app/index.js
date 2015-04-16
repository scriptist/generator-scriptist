'use strict';
var fs = require('fs');
var path = require('path');
var yeoman = require('yeoman-generator');
var yosay = require('yosay');
var chalk = require('chalk');
var wiredep = require('wiredep');

module.exports = yeoman.generators.Base.extend({
	constructor: function () {
		yeoman.generators.Base.apply(this, arguments);

		this.option('skip-welcome-message', {
			desc: 'Skips the welcome message',
			type: Boolean
		});

		this.option('skip-install', {
			desc: 'Skips the installation of dependencies',
			type: Boolean
		});

		this.option('skip-install-message', {
			desc: 'Skips the message after the installation of dependencies',
			type: Boolean
		});
	},

	initializing: function () {
		this.pkg = require('../package.json');
	},

	prompting: function () {
		var done = this.async();

		if (!this.options['skip-welcome-message']) {
			this.log(yosay('\'Allo \'allo! Out of the box I include HTML5 Boilerplate, jQuery, and a gulpfile.js to build your app.'));
		}

		var prompts = [{
			type: 'checkbox',
			name: 'features',
			message: 'What more would you like?',
			choices: [{
				name: 'JQuery',
				value: 'includeJQuery   ',
				checked: true
			},{
				name: 'Modernizr',
				value: 'includeModernizr',
				checked: true
			},{
				name: 'FTP Deployment',
				value: 'includeFTP',
				checked: false
			}]
		}];

		var FTPPrompts = [{
			type: 'input',
			name: 'host',
			message: 'FTP Host',
			store: true
		},{
			type: 'input',
			name: 'user',
			message: 'FTP Username',
			store: true
		},{
			type: 'input',
			name: 'dir',
			message: 'FTP Directory',
			default: '/public_html/' + this.appname
		}];

		this.prompt(prompts, function (answers) {
			var features = answers.features;

			var hasFeature = function (feat) {
				return features.indexOf(feat) !== -1;
			};

			// manually deal with the response, get back and store the results.
			// we change a bit this way of doing to automatically do this in the self.prompt() method.
			this.includeJQuery    = hasFeature('includeJQuery');
			this.includeModernizr = hasFeature('includeModernizr');
			this.includeFTP       = hasFeature('includeFTP');

			if (this.includeFTP) {
				this.prompt(FTPPrompts, function (answers) {
					this.FTPCredentials = answers;
					done();
				}.bind(this));
			} else {
				done();
			}

		}.bind(this));
	},

	writing: {
		gulpfile: function () {
			this.template('gulpfile.js');
		},

		packageJSON: function () {
			this.template('_package.json', 'package.json');
		},

		git: function () {
			this.copy('gitignore', '.gitignore');
		},

		bower: function () {
			var bower = {
				name: this._.slugify(this.appname),
				private: true,
				dependencies: {}
			};

			if (this.includeJQuery) {
				bower.dependencies.jquery = '~2.1.1';
			}

			if (this.includeModernizr) {
				bower.dependencies.modernizr = '~2.8.1';
			}

			this.copy('bowerrc', '.bowerrc');
			this.write('bower.json', JSON.stringify(bower, null, 2));
		},

		mainStylesheet: function () {
			var css = 'main.scss';

			this.directory('styles', 'app/styles');
		},

		writeIndex: function () {
			this.indexFile = this.src.read('index.html');
			this.indexFile = this.engine(this.indexFile, this);

			this.indexFile = this.appendFiles({
				html: this.indexFile,
				fileType: 'js',
				optimizedPath: 'scripts/main.js',
				sourceFileList: ['scripts/main.js']
			});

			this.write('app/index.html', this.indexFile);
		},

		app: function () {
			this.mkdir('app');
			this.mkdir('app/scripts');
			this.mkdir('app/styles');
			this.mkdir('app/images');
			this.mkdir('app/fonts');
			this.copy('scripts/main.coffee', 'app/scripts/main.coffee');
		}
	},

	install: function () {
		var howToInstall =
			'\nAfter running ' +
			chalk.yellow.bold('npm install & bower install') +
			', inject your' +
			'\nfront end dependencies by running ' +
			chalk.yellow.bold('gulp wiredep') +
			'.';

		if (this.options['skip-install']) {
			this.log(howToInstall);
			return;
		}

		this.installDependencies({
			skipMessage: this.options['skip-install-message'],
			skipInstall: this.options['skip-install']
		});

		this.on('end', function () {
			var bowerJson = this.dest.readJSON('bower.json');

			// wire Bower packages to .html
			wiredep({
				bowerJson: bowerJson,
				directory: 'bower_components',
				exclude: ['bootstrap-sass', 'bootstrap.js'],
				ignorePath: /^(\.\.\/)*\.\./,
				src: 'app/index.html'
			});

			// wire Bower packages to .scss
			wiredep({
				bowerJson: bowerJson,
				directory: 'bower_components',
				ignorePath: /^(\.\.\/)+/,
				src: 'app/styles/*.scss'
			});
		}.bind(this));
	}
});
