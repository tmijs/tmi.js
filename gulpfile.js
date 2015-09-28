var gulp = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var browserify = require("browserify");
var uglify = require("gulp-uglify");
var glob = require("glob");
var babel = require("babelify");
var size = require("gulp-size");

function compile(done) {
    glob("lib/*.js", function(err, files) {
        if (err) { done(err); }
        files.push("index.js");

        var bundler = browserify(files, { debug: true }).transform(babel);

        function rebundle() {
            bundler.bundle()
            .on("error", function(err) { console.error(err); this.emit("end"); })
            .pipe(source("tmi.js"))
            .pipe(buffer())
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(uglify())
            .pipe(sourcemaps.write("./"))
            .pipe(gulp.dest("./dist"))
            .pipe(size({ showFiles: true }));
        }

        rebundle();
    });
}

gulp.task("default", function() { return compile(); });
