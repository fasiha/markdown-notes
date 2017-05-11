"use strict";

/*
RUN AS:

$ nodemon index.js

SETUP:

First, run

$ npm install

Then create keys
(http://www.chovy.com/web-development/self-signed-certs-with-secure-websockets-in-node-js/):

$ openssl req -x509 -sha256 -newkey rsa:2048 -keyout key.pem -out cert.pem -days
1024 -nodes

Highly recommended but optional: instruct your operating system to trust this
key. https://certsimple.com/blog/localhost-ssl-fix for macOS but in a nutshell:

$ openssl pkcs12 -export -clcerts -inkey key.pem -in cert.pem -out MyPKCS12.p12
-name "Your Name"

followed by importing into Keychain.

Finally, run the server,

$ node server.js

IN THE BROWSER:

Bookmarklet code: prepend `javascript:` to the following function:
*/
(function bookmarklet() {
  if (typeof window !== 'undefined') {
    const o = {
      url : window.location.href,
      title : document.title,
      selection : window.getSelection().toString()
    };

    var d = (new Date()).toUTCString();
    var s = '    Date: ' + d + '\n    Tag: clip\n\n¶ [' + o.title + '](' +
            o.url + ')\n\n' + (o.selection ? '> ' : '') +
            o.selection.replace(/\n/g, '\n> ');
    console.log(s);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", 'https://localhost:8443', true);

    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/json");

    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        console.log("Clip response status: " + xhr.status);
      }
    };
    xhr.send(JSON.stringify(o));
  }
})();
/*
The above was the code you should put in your bookmarklet (after `javascript:`).

In Safari, minify text.

What follows is the server that Node runs.
*/

var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');

var app = express();
app.use(cors());
app.use(bodyParser.json());

var fs = require('fs');
var credentials = {
  key : fs.readFileSync(`${process.env.HOME}/.localhost-ssl/key.pem`, 'utf8'),
  cert : fs.readFileSync(`${process.env.HOME}/.localhost-ssl/cert.pem`, 'utf8')
};

var https = require('https');
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8443);

var glob = require('glob');
var child = require('child_process');
var moment = require('moment');
app.get('/', (req, res) => res.send('Please POST!'));
function getLastContentMd() {
  var v = glob.sync('content/*md');
  return v[v.length - 1];
}
app.post('/', (req, res) => {
  // console.log('POSTed!', req.body);
  res.send('ok');
  try {
    // child.execSync('git pull --rebase');
  } catch (e) {
    console.log('Cannot git pull. Check for uncommitted changes. ', e.message);
  }
  var latestMd = getLastContentMd();
  var md = fs.readFileSync(latestMd, 'utf8');
  var top = clipToString(req.body);
  // console.log(top);

  var mdTitle = extractTitle(md);
  var topTitle = extractTitle(top);
  if (mdTitle.title === topTitle.title) {
    md = md.slice(mdTitle.skip + topTitle.title.length).trimLeft();
    fs.writeFileSync(latestMd, top + '\n\n' + md);
    console.log('Appended to: ' + latestMd);
  } else {
    var tstring = moment(req.body.date || new Date()).utc().format();
    var fname = `content/${tstring.replace(/:/g, '..')}-clip.md`;
    console.log('Wrote to: ' + fname);

    fs.writeFileSync(fname, top);
  }
  // child.execSync('git add README.md && git commit -m clip && git push');
});
// Given the contents of README.md, return the first title/URL before the date.
function extractTitle(s) {
  var bad = {title : null, skip : 0};

  var skip = s.indexOf('\n\n¶ ');
  if (skip < 0) {
    return bad;
  }
  skip += 2; // those two newlines
  var firstLine = s.slice(skip, s.indexOf('\n', skip));
  return {title : firstLine.slice(0, firstLine.lastIndexOf(' (')), skip};
}
function escape(s) {
  return s.trim().replace(/>/g, '&gt;').replace(/</g, '&lt;');
}
function clipToString({url, title, selection, date}) {
  title = escape(title);
  if (title && url) {
    title = `[${title}](${url})`;
  } else if (title) {
    title = `**${title}**`;
  } else if (url) {
    title = url;
  } else {
    title = '';
  }
  date = moment((date || new Date()).toUTCString()).utc().format();
  var header = `    Date: ${date}
    Tag: clip

`;
  var titleEnd = `(${date})`;
  title = header + `¶ ${title} ${titleEnd}`;

  selection = escape(selection);
  if (selection.length) {
    let tail = selection.split('\n').map(s => `> ${s}  `).join('\n');
    return `${title}\n\n${tail}`;
  }
  return title;
}
