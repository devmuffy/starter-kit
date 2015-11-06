'use strict';

// =============================================
// Dependencies
// =============================================
var argv           = require('yargs').argv;
var autoprefixer   = require('autoprefixer');
var browserSync    = require('browser-sync').create();
var babelify       = require('babelify');
var browserify     = require('browserify');
var buffer         = require('vinyl-buffer');
var colors         = require('colors');
var concat         = require('gulp-concat');
var del            = require('del');
var eslint         = require('gulp-eslint');
var envify         = require('envify/custom');
var flatten        = require('gulp-flatten');
var gulp           = require('gulp');
var gulpFilter     = require('gulp-filter');
var gulpif         = require('gulp-if');
var mainBowerFiles = require('main-bower-files');
var postcss        = require('gulp-postcss');
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

  gulp.src('./sass/index.scss')
    .pipe(gulpif(isDevelopment, sourcemaps.init()))
      .pipe(sass({ outputStyle: sassOutputStyle }).on('error', sass.logError))
      .pipe(postcss([ autoprefixer({ browsers: ['last 2 versions'] }) ]))
      .pipe(rename('bundle.css'))
    .pipe(gulpif(isDevelopment, sourcemaps.write('.')))
    .pipe(gulp.dest('./dist'));
});

gulp.task('sass:watch', function () {
  gulp.watch('./sass/**/*.scss', ['sass']);
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
  return gulp.src(['./js/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format());
});

function createBundler() {
  var bundler = browserify({
    entries: ['./js/index.js'],
    debug: isDevelopment ? true : false,
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

  gulp.src(['./js/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format());

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
gulp.task('bower', function () {
  var jsFilter = gulpFilter(['**/*.js'], { restore: true });
  var cssFilter = gulpFilter(['**/*.css'], { restore: true });
  var fontFilter = gulpFilter(['*.eot', '*.woff', '*.svg', '*.ttf'], { restore: true });
  var imageFilter = gulpFilter(['*.gif', '*.png', '*.svg', '*.jpg', '*.jpeg'], { restore: true });

  return gulp.src(mainBowerFiles())
    .pipe(jsFilter)
      .pipe(concat('vendor.js'))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(gulp.dest('./dist'))
      .pipe(jsFilter.restore)

    .pipe(cssFilter)
      .pipe(concat('vendor.css'))
      .pipe(gulp.dest('./dist'))
      .pipe(cssFilter.restore)

    .pipe(fontFilter)
      .pipe(flatten())
      .pipe(gulp.dest('./dist/fonts'))
      .pipe(fontFilter.restore)

    .pipe(imageFilter)
      .pipe(flatten())
      .pipe(gulp.dest('./dist/images'))
      .pipe(imageFilter.restore);
});

function prettyDisplay(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

gulp.task('default', ['sass', 'sass:watch', 'js:watch', 'browser-sync']);
gulp.task('build', ['clean', 'sass', 'js', 'bower']);
