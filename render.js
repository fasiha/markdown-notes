"use strict";

var fs = require('fs');
var execSync = require('child_process').execSync;
var glob = require('glob');
var files = glob.sync('content/*md').sort();
files.reverse();
fs.writeFileSync(
    'whee.md',
    files.map(f => `\n\n### ${f}\n\n` + fs.readFileSync(f, 'utf8')).join(''));
execSync(
    'cp header.html whee.html && cmark-gfm -e autolink -e tagfilter -e table whee.md >> whee.html');


