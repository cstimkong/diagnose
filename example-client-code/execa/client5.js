const execa = require('execa');
const fs = require('fs');
const subprocess = execa('cat');
fs.createReadStream('stdin.txt').pipe(subprocess.stdin);