module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        jshint: {
            all: ["gruntfile.js", "index.js"],
            options: {
                curly: true,
                eqeqeq: true,
                eqnull: true,
                browser: true
            }
        },
        browserify: {
            dist: {
                files: {
                    "tests/browser/twitch-tmi.js": ["index.js", "/lib/*.js"]
                }
            }
        },
        uglify: {
            my_target: {
                files: {
                    "tests/browser/twitch-tmi.min.js": ["tests/browser/twitch-tmi.js"]
                }
            }
        }
    });

    // Load the plugin that provides the tasks.
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks("grunt-browserify");

    // Default task(s).
    grunt.registerTask("default", ["jshint", "browserify", "uglify"]);
};