var { series, parallel, src, dest, watch, lastRun } = require('gulp')

var gcmq    = require('gulp-group-css-media-queries');
var cssnano = require('gulp-cssnano')
var prefix  = require('gulp-autoprefixer')
var rename  = require('gulp-rename')
var rollup  = require('gulp-better-rollup')
var sass    = require('gulp-sass')
var size    = require('gulp-sizereport')

var babel      = require('rollup-plugin-babel')
var commonjs   = require('rollup-plugin-commonjs')
var json       = require('rollup-plugin-json')
var resolve    = require('rollup-plugin-node-resolve')
var { eslint } = require('rollup-plugin-eslint')
var { uglify } = require('rollup-plugin-uglify')

var browserSync = require('browser-sync')

/* Set node-sass direct */
sass.compiler = require('node-sass')

var isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development'
var isProduction = !isDevelopment
var server = browserSync.create()

var paths = {
  site: 'site/',
  watch: ['site/templates/**/*', 'site/snippets/**/*', 'assets/**/*'],
  js: {
    input: ['src/js/index.js', 'src/js/presentation.js'],
    watch: 'src/js/',
    output: 'assets/js/'
  },
  css: {
    input: 'src/scss/index.scss',
    watch: 'src/scss/',
    output: 'assets/css/'
  },
}

function sizeOutput() {
  return src('assets/**/*.{js,css}')
    .pipe(size())
}

function buildStyles() {
  return src(paths.css.input, { sourcemaps: isDevelopment })
    .pipe(sass({
      includePaths: 'node_modules/'
    })
    .on('error', sass.logError))
    .pipe(prefix())
    .pipe(gcmq())
    // .pipe(cssnano())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.css.output, { sourcemaps: isDevelopment }))
    .pipe(server.stream())
}

function buildScripts() {
  return src(paths.js.input, { sourcemaps: isDevelopment })
    .pipe(rollup({
      plugins: [
        // eslint({
        //   exclude: [
        //     'node_modules/**',
        //     'src/js/helpers/**',
        //     '**/*.json'
        //   ]
        // }),
        resolve(),
        commonjs(),
        json(),
        babel(),
        isProduction && uglify()
      ]
    }, 'iife'))
  .pipe(rename({ suffix: '.min' }))
  .pipe(dest(paths.js.output, { sourcemaps: isDevelopment }))
  .pipe(server.stream())
}

function startServer(done) {
  server.init({
    files: paths.watch,
    open: false,
    notify: false,
    ghost: false,
    proxy: 'localhost:8000'
  })

  done()
}

function reloadBrowser(done) {
  server.reload()

  done()
}

function watchSource(done) {
  watch(paths.js.watch, series(buildScripts))
  watch(paths.css.watch, series(buildStyles))

  done()
}

if (isDevelopment) {
  exports.default = series(
    buildScripts,
    buildStyles,
    parallel(
      startServer,
      watchSource
    )
  )
} else {
  exports.default = series(
    parallel(
      buildScripts,
      buildStyles
    ),
    sizeOutput
  )
}
