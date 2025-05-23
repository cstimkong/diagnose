const program = require('commander');

program.on('option:verbose', function () {
    process.env.VERBOSE = this.verbose;
  });
  
  // error on unknown commands
  program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
  });
  
