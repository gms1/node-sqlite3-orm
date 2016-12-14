"use strict";
const gulp = require('gulp');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const jsonTransform = require('gulp-json-transform');
const gsourcemaps = require('gulp-sourcemaps');
const ts = require('typescript');
const gts = require('gulp-typescript');
const tslint = require('tslint');
const gtslint = require('gulp-tslint');
const path = require('path');
const del = require('del');
const merge = require('merge-stream');
// ==================================================================================
// settings:

const outDir = './dist/';
const tsconfig = 'tsconfig.json';
const tslintconfig = 'tslint.json';
const watching = ['src/**/*'];

const transformDefinition = [
  {
    src: 'package.json',
    base: '.',
    out: outDir,
    jsonTransFunc: (data, file) => {
      // scripts: delete this section, because it will be non-functional
      if (!!data.scripts) {
        delete data.scripts;
      }
      // main: remove outDir
      if (!data.main || !data.main.startsWith(outDir)) {
        console.warn(
          `packages.json: 'main' attribute not starting with '${outDir}'`);
      } else {
        data.main = data.main.substr(outDir.length);
        if (data.main.length && data.main[0] === '/') {
          data.main = data.main.substr(1);
        }
      }
      // devDependencies: delete this section, which is not required anymore
      if (!!data.devDependencies) {
        delete data.devDependencies;
      }
      return data;
    },
    jsonTransWhitespace: 2
  },
  {
    src: '.npmignore',
    base: '.',
    out: outDir
  }
];

// ==================================================================================
// clean

gulp.task('clean', function () { return del([path.join(outDir, '*')]); })

// ==================================================================================
// transform-data

gulp.task('transform-data', function () {

  var transformpipes = [];

  transformDefinition.forEach((transformItem) => {
    if (transformItem.jsonTransFunc) {
      transformpipes.push(gulp.src(transformItem.src, { base: transformItem.base })
        .pipe(jsonTransform(transformItem.jsonTransFunc, transformItem.jsonTransWhitespace || 0))
        .pipe(gulp.dest(transformItem.out)));
    } else {
      transformpipes.push(gulp.src(transformItem.src, { base: transformItem.base }).pipe(gulp.dest(transformItem.out)));
    }
  });

  return merge(transformpipes);
})

// ==================================================================================
// tsc - transpile typescript sources

gulp.task('tsc', function () {
  var tsProject = gts.createProject(tsconfig, { typescript: ts });

  var tsOutDir = tsProject.config.compilerOptions.outDir;

  var relTSOutDir = path.relative(tsOutDir, '.');
  var relMYOutDir = path.relative(outDir, '.');
  if (relMYOutDir !== relTSOutDir) {
    console.warn(
      `different dist-directory defined in gulpfile.js '${outDir}' vs tsconfig.js '${tsOutDir}'`);
  }

  return tsProject.src()
    .pipe(gsourcemaps.init())
    .pipe(tsProject(gts.reporter.longReporter()))
    .pipe(gsourcemaps.write('.', { includeContent: false, sourceRoot: '.' }))
    .pipe(gulp.dest(outDir));
});

// ==================================================================================
// tslint - typescript linter

gulp.task('tslint', function () {
  var tsProject = gts.createProject(tsconfig, { typescript: ts });

  return tsProject.src()
    .pipe(gtslint({ configuration: tslintconfig, tslint: tslint }))
    .pipe(gtslint.report());
})


// ==================================================================================
// build

gulp.task('build', ['transform-data', 'tsc', 'tslint']);

// ==================================================================================
// rebuild

gulp.task('rebuild', ['clean', 'build']);

// ==================================================================================
// watch

gulp.task('watch-build', ['transform-data', 'tsc']);

gulp.task('watch', ['build'], function () {
  watch(watching, batch(function (events, done) { gulp.start('watch-build', done); }));
});

// ==================================================================================
// default

gulp.task('default', ['build']);