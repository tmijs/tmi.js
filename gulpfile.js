var gulp = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var browserify = require("browserify");
var uglify = require("gulp-uglify");
var babel = require("babelify");
var size = require("gulp-size");

function compile() {
    function rebundle() {
        var bundler = browserify(["./index.js"], {
            debug: true,
            builtins: true
        }).transform(babel);

        bundler.exclude("mocha");
        bundler.exclude("should");
        bundler.exclude("request");
        bundler.exclude("ws");
        bundler.exclude("utf-8-validate");
        bundler.exclude("bufferutil");

        return bundler.bundle()
        .on("error", function(err) { console.error(err); this.emit("end"); })
        .pipe(source("tmi.js"))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglify())
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest("./dist"))
        .pipe(size({ showFiles: true }));
    }

    return rebundle();
}

gulp.task("default", compile);
