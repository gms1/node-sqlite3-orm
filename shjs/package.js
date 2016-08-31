"use strict";
require('shelljs/global');
var path = require('path');

var distdir = 'dist/sqlite3orm';
var packagedir = 'package';

rm('-rf', packagedir);
mkdir('-p',packagedir);

cp('.npmignore', packagedir);
cp('package.json', packagedir);
cp('LICENSE', packagedir);
cp('README.md', packagedir);

find(distdir).filter(function(file) { 
  if (file.match(/\/spec\//))
    return false;
  if (file.match(/\.d\.ts$/))
    return true;
  if (file.match(/\.js$/))
    return true;
  return false;
}).forEach((infile) => {
  var outfile = packagedir + '/' + infile.substr(distdir.length);
  var outdir = path.dirname(outfile);
  if (!test('-d', outdir))
    mkdir('-p',outdir);
  cp(infile, outfile);
});
