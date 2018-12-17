const gulp = require('gulp')
const sequence = require('gulp-sequence').use(gulp)

require('gulp-static-web')(gulp, {
  postcss: [
    require('postcss-import'),
    require('precss'),
    require('autoprefixer'),
    require('lost'),
    require('postcss-nested-vars'),
    require('postcss-color-function'),
  ],
})

gulp.task('default', sequence('static', ['browserify', 'postcss']))
