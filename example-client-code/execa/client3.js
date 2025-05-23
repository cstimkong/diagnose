const execa = require('execa');

const subprocess = execa('echo', ['foo']);
subprocess.stdout.pipe(process.stdout);

(async () => {
	const {stdout} = await subprocess;
	console.log('child output:', stdout);
})();