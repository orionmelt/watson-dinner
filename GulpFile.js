(function () {
  'use strict';

  var $ = require('gulp-load-plugins')();
  var browserSync = require('browser-sync');
  var del = require('del');
  var distFolder = 'public';
  var env = require('gulp-env');
  var gulp = require('gulp');
  var nodemon = require('gulp-nodemon');
  var reload = browserSync.reload;
  var gulpSequence = require('gulp-sequence');
  var srcFolder = 'ui';

  gulp.on('error', $.util.log);

  // Set Bluemix variables
  gulp.task('set-env', function() {
    env({
      file: '.env.js',
      vars: {
        NODE_ENV: 'development'
      }
    });
  });

  // Compile images
  gulp.task('images', function () {
    return gulp.src(srcFolder + '/images/**/*')
      .pipe(gulp.dest(distFolder + '/images'))
      .pipe(reload({ stream: true, once: true }))
      .pipe($.size({ title: 'images' }));
  });

  gulp.task('bower', function () {
    return $.bower('.tmp/bower_components');
  });

  // Compile javascript
  gulp.task('js', function () {
    return gulp.src([srcFolder + '/**/*.js'])
      .pipe($.preprocess())
      .pipe(gulp.dest('.tmp'));
  });

  gulp.task('styles', function () {
    return gulp.src(srcFolder + '/**/*.css')
      .pipe($.autoprefixer('last 1 version'))
      .pipe(gulp.dest('.tmp'))
      .pipe(reload({ stream: true }))
      .pipe($.size({ title: 'styles' }));
  });

  gulp.task('html:compile', function () {
    return gulp.src([
      '!' + srcFolder + '/index.html', '!' + srcFolder + '/tos/index.html',
      srcFolder + '/**/*.html'
      ])
      .pipe($.angularTemplatecache('templates.js', { standalone: true }))
      .pipe(gulp.dest('.tmp'));
  });

  gulp.task('compile', [ 'bower', 'js', 'html:compile', 'images', 'styles' ]);

  // Reload all Browser windows
  gulp.task('bs-reload',['compile'], function() {
      browserSync.reload();
  });

  // Browser-sync start server
  gulp.task('browser-sync', ['nodemon'], function() {
    browserSync({
      proxy: 'localhost:3000', // local node app address
      port: 5000, // use *different* port than above
      notify: true
    });
  });

  // initiate nodemon
  gulp.task('nodemon', ['set-env'], function(cb) {
    var called = false;
    return nodemon({
      script: 'app.js',
      ignore: [ 'Gulpfile.js', 'node_modules/' ]
    })
    .on('start', function() {
      if (!called) {
        called = true;
        cb();
      }
    })
    .on('restart', function() {
      setTimeout(function() { reload({ stream: false }); }, 2000);
    });
  });

  gulp.task('clean', del.bind(null, [ distFolder ]));

  gulp.task('build', ['compile'], function(){
      var assets = $.useref.assets({ 'searchPath': '.tmp' });

      return gulp.src(srcFolder + '/index.html')
        .pipe(assets)
        .pipe($.if('*.js', $.ngAnnotate()))
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', $.minifyCss()))
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.if('*.html', $.minifyHtml({ empty: true, quotes: true })))
        .pipe(gulp.dest(distFolder))
        .pipe($.size({ 'title': 'html' }));
  });

  gulp.task('dist', gulpSequence('clean', 'build'));

  gulp.task('default', function(cb) {
    gulpSequence('build', 'browser-sync', function() {
      gulp.watch([srcFolder + '/images/**/*.*'], ['images']);
      gulp.watch([srcFolder + '/styles/**/*.*'], ['build']);
      gulp.watch([srcFolder + '/modules/**/*.*'], ['build']);
      cb();
    });
  });

}());
