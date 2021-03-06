module.exports = function(grunt) {

  grunt.initConfig({
    watch: {
      scripts: {
        files: ['src/**/*.ts', 'src/**/*.html'],
        tasks: ['typescript:base']
      },
      test: {
        files: ['test/**/*.ts'],
        tasks: ['typescript:test']
      }
    },
    typescript: {
      base: {
        src: ['src/**/*.ts'],
        dest: 'bin',
        options: {
          module: 'commonjs',
          target: 'es5',
          basePath: 'src'
        }
      },
      test: {
        src: ['test/**/*.ts'],
        dest: 'test',
        options: {
          module: 'commonjs',
          target: 'es5',
          basePath: 'test'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-typescript');

  grunt.registerTask('default', [
    'typescript'
  ]);

  grunt.registerTask('debug', [
    'typescript',
    'watch'
  ]);

};
