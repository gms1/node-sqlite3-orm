const files = ['./gulp/gulpfile.ts'];
files.forEach(function(file) {
  eval(
      require('typescript')
          .transpile(require('fs').readFileSync(file).toString()),
      {'experimentalDecorators': true})
});
