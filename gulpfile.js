'use strict';

// =============================================
// Dependencies
// =============================================
var argv           = require('yargs').argv;
var autoprefixer   = require('autoprefixer');
var babelify       = require('babelify');
var browserSync    = require('browser-sync').create();
var browserify     = require('browserify');
var buffer         = require('vinyl-buffer');
var colors         = require('colors');
var concat         = require('gulp-concat');
var del            = require('del');
var eslint         = require('gulp-eslint');
var envify         = require('envify/custom');
var flatten        = require('gulp-flatten');
var gulp           = require('gulp');
var gulpif         = require('gulp-if');
var minifyCss      = require('gulp-minify-css');
var postcss        = require('gulp-postcss');
var replace        = require('gulp-replace');
var rename         = require('gulp-rename');
var sass           = require('gulp-sass');
var source         = require('vinyl-source-stream');
var sourcemaps     = require('gulp-sourcemaps');
var uglify         = require('gulp-uglify');
var watchify       = require('watchify');


// =============================================
// Environment
// =============================================
var isDevelopment = true;

if (argv.production) {
  isDevelopment = false;
}

gulp.task('clean', function () {
  if (!isDevelopment) {
    return del([
      'dist/*'
    ]);
  }
});


// =============================================
// BrowserSync
// =============================================
gulp.task('browser-sync', function () {
  browserSync.init(['./dist/*.css', './dist/*.js', 'index.html'], {
    server: {
      baseDir: './'
    }
  });
});


// =============================================
// Sass
// =============================================
gulp.task('sass', function () {
  // sourcemaps doesn't work with compressed output style
  var sassOutputStyle = isDevelopment ? 'compact' : 'compressed';

  gulp.src('./assets/sass/index.scss')
    .pipe(gulpif(isDevelopment, sourcemaps.init()))
      .pipe(sass({ outputStyle: sassOutputStyle }).on('error', sass.logError))
      .pipe(postcss([
        autoprefixer({ browsers: ['last 2 versions'] })
      ]))
      .pipe(rename('bundle.css'))
    .pipe(gulpif(isDevelopment, sourcemaps.write('.')))
    .pipe(gulp.dest('./dist'));
});

gulp.task('sass:watch', function () {
  gulp.watch('./assets/sass/**/*.scss', ['sass']);
});


// =============================================
// JavaScript
// =============================================
gulp.task('js', function () {
  var bundler = createBundler();

  bundle(bundler);
});

gulp.task('js:watch', function () {
  var bundler = createBundler();

  bundler.plugin(watchify);
  bundler.on('update', function () {
    bundle(bundler);
  });

  bundle(bundler);
});

gulp.task('js:lint', function () {
  return lintJS();
});

function lintJS() {
  return gulp.src(['./assets/js/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format());
}

function createBundler() {
  var bundler = browserify({
    entries: ['./assets/js/index.js'],
    debug: isDevelopment,
    cache: {},
    packageCache: {}
  })
  .transform(envify({
    NODE_ENV: isDevelopment ? 'development' : 'production'
  }))
  .transform(babelify);

  return bundler;
}

function bundle(bundler) {
  var bundleTimeStart = Date.now();

  console.log(colors.green('------------------- REBUNDLE -------------------'));

  lintJS();

  bundler
    .bundle()
    .on('error', function (err) {
      console.log(colors.red(err));
    })
    .pipe(source('./bundle.js'))
    .pipe(gulpif(!isDevelopment, buffer()))
    .pipe(gulpif(!isDevelopment, uglify()))
    .pipe(gulp.dest('./dist'));

  console.log('[' + colors.cyan('JS') + '] Bundling time: ' + colors.green((Date.now() - bundleTimeStart) + 'ms'));
}


// =============================================
// Vendor
// =============================================
gulp.task('vendor', function() {
  gulp.src('./assets/vendor/**/*.js')
    .pipe(concat('vendor.js'))
    .pipe(gulpif(isDevelopment, sourcemaps.init()))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulpif(isDevelopment, sourcemaps.write('.')))
    .pipe(gulp.dest('./dist'));

  gulp.src('./assets/vendor/**/*.css')
    .pipe(concat('vendor.css'))
    .pipe(gulpif(isDevelopment, sourcemaps.init()))
    .pipe(minifyCss())
    .pipe(gulpif(isDevelopment, sourcemaps.write('.')))
    .pipe(replace(/url\s*\("?\/?(?:[^\/]+\/)*?([^\/]+?\.[^\"\'\)\/]+)"?\)/g, 'url(assets/$1)'))
    .pipe(gulp.dest('./dist'));

  gulp.src('./assets/vendor/**/*.{eot,gif,jpeg,jpg,png,svg,ttf,woff}')
    .pipe(flatten())
    .pipe(gulp.dest('./dist/assets'));
});

gulp.task('default', ['sass', 'sass:watch', 'js:watch', 'browser-sync']);
gulp.task('build', ['clean', 'sass', 'js', 'vendor']);
