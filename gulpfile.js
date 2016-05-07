var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    fs = require('fs-extra');


gulp.task('compile', function () {
    var tsResult = gulp.src(['./typings/**/*.ts', './src/**/*.ts'])
        .pipe(ts({
            target: 'es5',
            module: 'commonjs'/*,
             declaration: true,
             noExternalResolve: true*/
        }));
    return tsResult.js.pipe(gulp.dest('./bin'));
});

gulp.task('watch', function () {
    gulp.watch('./src/**/*.ts', ['compile']);
});

gulp.task('clean', function (done) {
    fs.removeSync('bin');
    done();
});

gulp.task('default', ['clean', 'compile', 'watch']);
