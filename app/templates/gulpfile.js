/*global -$ */
'use strict';
// generated on <%= (new Date).toISOString().split('T')[0] %> using <%= pkg.name %> <%= pkg.version %>
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var reload = browserSync.reload;

<% if (includeFTP) { %>
// FTP requirements
var ftp = require( 'vinyl-ftp' );
var FTPCredentials = {
	host: '<%= FTPCredentials.host.replace(/\'/g, "\\\'") %>',
	user: '<%= FTPCredentials.user.replace(/\'/g, "\\\'") %>',
	dir: '<%= FTPCredentials.dir.replace(/\'/g, "\\\'") %>'
};
<% } %>


gulp.task('styles', function () {
	return gulp.src('app/styles/**/*.scss')
		.pipe($.sourcemaps.init())
		.pipe($.sass({
			outputStyle: 'nested', // libsass doesn't support expanded yet
			precision: 10,
			includePaths: ['.'],
			onError: console.error.bind(console, 'Sass error:')
		}))
		.pipe($.postcss([
			require('autoprefixer-core')({browsers: ['last 1 version']})
		]))
		.pipe($.sourcemaps.write())
		.pipe(gulp.dest('.tmp/styles'))
		.pipe(reload({stream: true}));
});

gulp.task('scripts', function () {
	return gulp.src('app/scripts/**/*.coffee')
		.pipe($.coffee())
		.pipe(gulp.dest('.tmp/scripts'))
		.pipe(reload({stream: true}));
});
<% if (includeSwig) { %>
gulp.task('swig', function () {
	return gulp.src('app/[^_]*.swig')
		.pipe($.swig({defaults: {cache: false}}))
		.pipe(gulp.dest('.tmp'))
		.pipe(reload({stream: true}));
});
<% } %>
gulp.task('html', ['styles', 'scripts'<% if (includeSwig) { %>, 'swig'<% } %>], function () {
	var assets = $.useref.assets({searchPath: ['.tmp', 'app', '.']});

	return gulp.src(<% if (includeSwig) { %>[<% } %>'app/*.html'<% if (includeSwig) { %>, '.tmp/*.html']<% } %>)
		.pipe(assets)
		.pipe($.if('*.js', $.uglify()))
		.pipe($.if('*.css', $.csso()))
		.pipe(assets.restore())
		.pipe($.useref())
		.pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
		.pipe(gulp.dest('dist'));
});

gulp.task('images', function () {
	return gulp.src('app/images/**/*')
		.pipe($.cache($.imagemin({
			progressive: true,
			interlaced: true,
			// don't remove IDs from SVGs, they are often used
			// as hooks for embedding and styling
			svgoPlugins: [{cleanupIDs: false}]
		})))
		.pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', function () {
	return gulp.src(require('main-bower-files')({
		filter: '**/*.{eot,svg,ttf,woff,woff2}'
	}).concat('app/fonts/**/*'))
		.pipe(gulp.dest('.tmp/fonts'))
		.pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', function () {
	return gulp.src([
		'app/*.*',
		'!app/*.html'<% if (includeSwig) { %>,
		'!app/*.swig'<% } %>
	], {
		dot: true
	}).pipe(gulp.dest('dist'));
});

gulp.task('clean', require('del').bind(null, ['.tmp', 'dist']));

gulp.task('serve', ['styles', 'scripts', 'fonts'<% if (includeSwig) { %>, 'swig'<% } %>], function () {
	browserSync({
		notify: false,
		port: 9000,
		server: {
			baseDir: ['.tmp', 'app'],
			routes: {
				'/bower_components': 'bower_components'
			}
		}
	});

	// watch for changes
	gulp.watch([
		'app/*.html',
		'app/scripts/**/*.js',
		'app/images/**/*',
		'.tmp/fonts/**/*'
	]).on('change', reload);
<% if (includeSwig) { %>
	gulp.watch('app/**/*.swig', ['swig']);<% } %>
	gulp.watch('app/styles/**/*.scss', ['styles']);
	gulp.watch('app/scripts/**/*.coffee', ['scripts']);
	gulp.watch('app/fonts/**/*', ['fonts']);
	gulp.watch('bower.json', ['wiredep', 'fonts']);
});

gulp.task('serve:dist', function () {
	browserSync({
		notify: false,
		port: 9000,
		server: {
			baseDir: ['dist']
		}
	});
});

// inject bower components
gulp.task('wiredep', function () {
	var wiredep = require('wiredep').stream;
	gulp.src('app/styles/*.scss')
		.pipe(wiredep({
			ignorePath: /^(\.\.\/)+/
		}))
		.pipe(gulp.dest('app/styles'));
	gulp.src('app/*.html')
		.pipe(wiredep({
			ignorePath: /^(\.\.\/)*\.\./
		}))
		.pipe(gulp.dest('app'));
});

gulp.task('build', ['html', 'images', 'fonts', 'extras'], function () {
	return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

<% if (includeFTP) { %>
gulp.task('deploy', ['build'], function (cb) {
	process.stdout.write('    Deploying to ' +
							FTPCredentials.user +
							'@' +
							FTPCredentials.host +
							FTPCredentials.dir +
							'\n');
	gulp.src('*')
		.pipe($.prompt.prompt(
			{
				type: 'password',
				name: 'password',
				message: 'Enter FTP password:'
			},
			function(res) {
				var conn = ftp.create({
					host:     FTPCredentials.host,
					user:     FTPCredentials.user,
					password: res.password,
					parallel: 10
				});

				var stream = gulp.src( 'dist/**/*', { base: 'dist', buffer: false } )
					.pipe(conn.differentSize(FTPCredentials.dir)) // only upload newer files
					.pipe(conn.dest(FTPCredentials.dir));

				stream.on('end', cb);
				stream.on('error', cb);
			}
		))
});
<% } %>

gulp.task('default', ['clean'], function () {
	gulp.start('build');
});
