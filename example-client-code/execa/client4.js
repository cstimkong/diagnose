const execa = require('execa');
const fs = require('fs');
const subprocess = execa('echo', ['foo']);
subprocess.stdout.pipe(fs.createWriteStream('stdout.txt'));