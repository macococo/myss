module.exports = function(grunt) {

  grunt.initConfig({
    watch: {
      scripts: {
        files: ['src/**/*.ts', 'src/**/*.html'],
        tasks: ['typescript']
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
