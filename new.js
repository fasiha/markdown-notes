"use strict";

var moment = require('moment');
var tstring = moment().utc().format();
var fname = `content/${tstring.replace(/:/g, '..')}-now-muse.md`;
var header = `    Date: ${tstring}
    Tags: now-muse

`;

var fs = require('fs');
fs.writeFileSync(fname, header);
console.log('Edit:\n\n' + fname);
