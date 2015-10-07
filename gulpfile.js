var gulp = require('gulp');
var stylus = require('gulp-stylus');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var watch = require('gulp-watch');
var livereload = require('gulp-livereload');
var concat = require('gulp-concat');
var nib = require('nib');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');

var bowerjs = []
var bowercss = [
  "turret/dist/turret.min.css"
]

var prefix = function(b) {
  return 'bower_components/' + b;
}

bowerjs = _.map(bowerjs, prefix);
bowercss = _.map(bowercss, prefix);

gulp.task('stylus', function() {
  gulp
    .src('stylesheets/styles.styl')
    .pipe(plumber())
    .pipe(stylus({
      compress: true,
      use: nib(),
      sourcemap: {
        inline: true,
        sourceRoot: '.',
        basePath: 'public/build',
      }
    }))
    .pipe(sourcemaps.init({
      loadMaps: true
    }))
    .pipe(sourcemaps.write('.', {
      includeContent: false,
      sourceRoot: '.'
    }))
    .pipe(gulp.dest('public/build'))
    .pipe(livereload());
});

gulp.task('concat-js', function() {
  gulp
    .src(bowerjs)
    .pipe(concat('bower.js'))
    .pipe(gulp.dest('public/build'))
})

gulp.task('concat-css', function() {
  gulp
    .src(bowercss)
    .pipe(concat('bower.css'))
    .pipe(gulp.dest('public/build'))
})

gulp.task('concat', ['concat-js', 'concat-css'])

gulp.task('watch', ['concat', 'stylus'], function() {
  livereload.listen({
    port: 30002
  });

  var changed = function(file) {
    var ext = path.extname(file.path);
    switch(ext) {
      case '.js': gulp.start('js'); break;
      case '.html': gulp.start('html'); break;
      case '.styl': gulp.start('stylus'); break;
    }
  }

  var paths = [
    'stylesheets/**/*.styl',
    'views/*'
  ];

  _.each(paths, function(path) {
    watch(path, changed);
  });
});

gulp.task('default', ['concat', 'stylus']);