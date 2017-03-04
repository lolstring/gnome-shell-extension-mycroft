
/* eslint-env node */
/* eslint-disable no-sync */
'use strict';

var gulp = require('gulp');
var sass = sass = require('gulp-ruby-sass');



var del = require('del');
var execSync = require('child_process').execSync;
var osenv = require('osenv');
var path = require('path');
var runSequence = require('run-sequence');

var eslint = require('gulp-eslint');
var threshold = require('gulp-eslint-threshold');
var jsonEditor = require('gulp-json-editor');
var shell = require('gulp-shell');
var symlink = require('gulp-symlink');
var zip = require('gulp-zip');

var metadata = require('./src/metadata.json');

var paths = {
  src: [
    'src/**/*',
    '!src/**/*~',
    '!src/schemas{,/**/*}',
    '!src/metadata.json',
    '!src/.eslintrc',
  ],
  lib: [ 'lib/**/*' ],
  metadata: [ 'src/metadata.json' ],
  schemas: [ 'src/schemas/**/*' ],
  install: path.join(
    osenv.home(),
    '.local/share/gnome-shell/extensions',
    metadata.uuid
  ),
};

function getVersion(rawTag) {
  var sha1, tag;
  sha1 = execSync('git rev-parse --short HEAD').toString().replace(/\n$/, '');

  try {
    tag = execSync('git describe --tags --exact-match ' + sha1 + ' 2>/dev/null').toString().replace(/\n$/, '');
  } catch (e) {
    return sha1;
  }

  if (rawTag) {
    return tag;
  }

  var v = parseInt(tag.replace(/^v/, ''), 10);
  if (isNaN(v)) {
    throw new Error('Unable to parse version from tag: ' + tag);
  }
  return v;
}

gulp.task('lint', function () {
  var thresholdWarnings = 1;
  var thresholdErrors = 1;
  return gulp.src([ '**/*.js' ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(threshold.afterErrors(thresholdErrors, function (numberOfErrors) {
      throw new Error('ESLint errors (' + numberOfErrors + ') equal to or greater than the threshold (' + thresholdErrors + ')');
    }))
    .pipe(threshold.afterWarnings(thresholdWarnings, function (numberOfWarnings) {
      throw new Error('ESLint warnings (' + numberOfWarnings + ') equal to or greater than the threshold (' + thresholdWarnings + ')');
    }));
});

gulp.task('sass', function() {
  return gulp.src('sass/stylsheet.scss')
    .pipe(sass({
      style: 'expanded'
    }))
    .pipe(gulp.dest('build'))
});

gulp.task('clean', function (cb) {
  return del([ 'build/' ], cb);
});

gulp.task('copy', function () {
  return gulp.src([paths.src,'!src/sass/'])
    .pipe(gulp.dest('build'));
});

gulp.task('copy-lib', function () {
  return gulp.src(paths.lib)
    .pipe(gulp.dest('build/lib'));
});

gulp.task('copy-license', function () {
  return gulp.src([ 'LICENSE' ])
    .pipe(gulp.dest('build'));
});

gulp.task('metadata', function () {
  return gulp.src(paths.metadata)
    .pipe(jsonEditor(function (json) {
      json.version = getVersion();
      return json;
    }, { end_with_newline: true }))
    .pipe(gulp.dest('build'));
});

gulp.task('schemas', shell.task([
  'mkdir -p build/schemas',
  'glib-compile-schemas --strict --targetdir build/schemas src/schemas/',
]));

gulp.task('build', function (cb) {
  runSequence(
    'clean',
    [
      'metadata',
      'schemas',
      'copy',
      'copy-lib',
      'copy-license',
    ],
    cb
  );
});

gulp.task('watch', [ 'build' ], function () {
  gulp.watch(paths.src, [ 'copy' ]);
  gulp.watch(paths.lib, [ 'copy-lib' ]);
  gulp.watch(paths.metadata, [ 'metadata' ]);
  gulp.watch(paths.schemas, [ 'schemas' ]);
});

gulp.task('reset-prefs', shell.task([
  'dconf reset -f /org/gnome/shell/extensions/mycroft/',
]));

gulp.task('uninstall', function (cb) {
  return del([ paths.install ], { force: true }, cb);
});

gulp.task('install-link', [ 'uninstall', 'build' ], function () {
  return gulp.src([ 'build' ])
    .pipe(symlink(paths.install));
});

gulp.task('install', [ 'uninstall', 'build' ], function () {
  return gulp.src([ 'build/**/*' ])
    .pipe(gulp.dest(paths.install));
});

gulp.task('require-clean-wd', function (cb) {
  var count = execSync('git status --porcelain | wc -l').toString().replace(/\n$/, '');
  if (parseInt(count, 10) !== 0) {
    return cb(new Error('There are uncommited changes in the working directory. Aborting.'));
  }
  return cb();
});

gulp.task('bump', function (cb) {
  var v;
  var stream = gulp.src(paths.metadata)
    .pipe(jsonEditor(function (json) {
      json.version++;
      v = 'v' + json.version;
      return json;
    }, { end_with_newline: true }))
    .pipe(gulp.dest('src'));
  stream.on('error', cb);
  stream.on('end', function () {
    execSync('git commit src/metadata.json -m "Bump version"');
    execSync('git tag ' + v);
    return cb();
  });
});

gulp.task('push', function (cb) {
  execSync('git push origin');
  execSync('git push origin --tags');
  return cb();
});

gulp.task('dist', [ 'lint' ], function (cb) {
  runSequence('build', function () {
    var zipFile = metadata.uuid + '-' + getVersion(true) + '.zip';
    var stream = gulp.src([ 'build/**/*' ])
      .pipe(zip(zipFile))
      .pipe(gulp.dest('dist'));
    stream.on('error', cb);
    stream.on('end', cb);
  });
});

gulp.task('release', [ 'lint' ], function (cb) {
  runSequence(
    'require-clean-wd',
    'bump',
    'push',
    'dist',
    cb
  );
});

gulp.task('enable-debug', shell.task([
  'dconf write /org/gnome/shell/extensions/gravatar/debug true',
]));

gulp.task('disable-debug', shell.task([
  'dconf write /org/gnome/shell/extensions/gravatar/debug false',
]));

gulp.task('test', function (cb) {
  runSequence(
    'lint',
    cb
  );
});

gulp.task('default', function () {
  /* eslint-disable no-console, max-len */
  console.log(
    '\n' +
    'Usage: gulp [COMMAND]\n' +
    '\n' +
    'Commands\n' +
    '\n' +
    'TEST\n' +
    '  lint                  Lint source files\n' +
    '  test                  Runs the test suite\n' +
    '\n' +
    'BUILD\n' +
    '  clean                 Cleans the build directory\n' +
    '  build                 Builds the extension\n' +
    '  watch                 Builds and watches the src directory for changes\n' +
    '\n' +
    'INSTALL\n' +
    '  install               Installs the extension to\n' +
    '                        ~/.local/share/gnome-shell/extensions/\n' +
    '  install-link          Installs as symlink to build directory\n' +
    '  uninstall             Uninstalls the extension\n' +
    '  reset-prefs           Resets extension preferences\n' +
    '\n' +
    'PACKAGE\n' +
    '  dist                  Builds and packages the extension\n' +
    '  release               Bumps/tags version and builds package\n' +
    '\n' +
    'DEBUG\n' +
    '  enable-debug          Enables debug mode\n' +
    '  disable-debug         Disables debug mode\n'
  );
  /* eslint-esnable no-console, max-len */
});