var _ = require('lodash');

var commands = require('ioredis-commands');
_.keys(commands).forEach(function (command) {
  exports[command.toLowerCase()] = function () {
    var args = _.toArray(arguments);
    var callback;
    // If the last argument is a callback function
    if (typeof args[args.length - 1] === 'function') {
      callback = args.pop();
    }
    return this.sendCommand(command, args, callback);
  };
});

