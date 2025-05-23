const execa = require('execa');

(async () => {
	// Pipe the child process stdout to the current stdout
	execa('echo', ['unicorns']).stdout.pipe(process.stdout);


	// Catching an error
	try {
		await execa('wrong', ['command']);
	} catch (error) {
		console.log(error);
		/*
		{
			message: 'Command failed with exit code 2 (ENOENT): wrong command spawn wrong ENOENT',
			errno: 'ENOENT',
			syscall: 'spawn wrong',
			path: 'wrong',
			spawnargs: ['command'],
			command: 'wrong command',
			exitCode: 2,
			exitCodeName: 'ENOENT',
			stdout: '',
			stderr: '',
			all: '',
			failed: true,
			timedOut: false,
			isCanceled: false,
			killed: false
		}
		*/
	}

	// Cancelling a spawned process
	const subprocess = execa('node');
	setTimeout(() => {
		subprocess.cancel();
	}, 1000);
	try {
		await subprocess;
	} catch (error) {
		console.log(subprocess.killed); // true
		console.log(error.isCanceled); // true
	}
})();

// Catching an error with a sync method
try {
	execa.sync('wrong', ['command']);
} catch (error) {
	console.log(error);
	/*
	{
		message: 'Command failed with exit code 2 (ENOENT): wrong command spawnSync wrong ENOENT',
		errno: 'ENOENT',
		syscall: 'spawnSync wrong',
		path: 'wrong',
		spawnargs: ['command'],
		command: 'wrong command',
		exitCode: 2,
		exitCodeName: 'ENOENT',
		stdout: '',
		stderr: '',
		failed: true,
		timedOut: false,
		isCanceled: false,
		killed: false
	}
	*/
}

// Kill a process with SIGTERM, and after 2 seconds, kill it with SIGKILL
const subprocess = execa('node');
setTimeout(() => {
	subprocess.kill('SIGTERM', {
		forceKillAfterTimeout: 2000
	});
}, 1000);