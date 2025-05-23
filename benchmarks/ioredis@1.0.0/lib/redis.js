var _ = require('lodash');
// TODO benchmark
var Queue = require('fastqueue');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');

function Redis(port, host) {
  if (!(this instanceof Redis)) return new Redis(port, host);

  if (typeof port === 'object') {
    this.options = port;
  } else {
    this.options = {
      port: port,
      host: host
    };
  }
  _.defaults(this.options, Redis.defaultOptions);

  this.parser = require('./parser/javascript');

  // disconnected -> connecting -> connected
  this.status = 'disconnected';

  this.connect();
}

util.inherits(Redis, EventEmitter);

Redis.defaultOptions = {
  port: 6379,
  host: '127.0.0.1'
};

Redis.prototype.connect = function () {
  if (this.options.path) {
    this.connectionOptions = _.pick(this.options, ['path']);
  } else {
    this.connectionOptions = _.pick(this.options, ['port', 'host', 'family']);
  }
  var stream = this.stream = net.createConnection(this.connectionOptions);

  stream.on('connect', this.onConnect.bind(this));
  stream.on('data', this.onData.bind(this));
  stream.on('error', this.onError.bind(this));
  stream.on('close', this.onClose.bind(this));
  stream.on('end', this.onEnd.bind(this));
  stream.on('drain', this.onDrain.bind(this));
};

Redis.prototype.sendCommand = function (commandName, args, callback) {
  var arg, command_obj, i, il, elem_count, buffer_args, stream = this.stream, command_str = "", buffered_writes = 0, last_arg_type, lcaseCommand;

  if (typeof command !== 'string') {
    throw new Error('First argument to send_command must be the command name string, not ' + typeof command);
  }
  if (!Array.isArray(args)) {
    throw new Error('Second argument must be an array');
  }
  if (callback && typeof callback !== 'function') {
    throw new Error('Last argument must be a callback or undefined');
  }
  args = _.flatten(args);

  var command = new Command(commandName, args, callback);

  if (this.mode.subscriber && !command.subscriber) {
    command.reject(new Error('Connection in subscriber mode, only subscriber commands may be used'));
  }

  if (this.status === 'connected') {
    this.stream.write(command.toString());
  } else {
    if (this.options.enableOfflineQueue) {
      this.offlineQueue.push(command);
    } else {
      command.reject(new Error('Stream isn\'t writeable and enableofflineQueue options is false'));
    }
  }

  this.commandQueue.push(command);

  return command.promise();
};

Redis.prototype.initParser = function () {
  var self = this;

  // return_buffers sends back Buffers from parser to callback. detect_buffers sends back Buffers from parser, but
  // converts to Strings if the input arguments are not Buffers.
  this.reply_parser = new this.parser.Parser({
    return_buffers: self.options.return_buffers || self.options.detect_buffers || false
  });

  // "reply error" is an error sent back by Redis
  this.reply_parser.on("reply error", function (reply) {
    if (reply instanceof Error) {
      self.return_error(reply);
    } else {
      self.return_error(new Error(reply));
    }
  });
  this.reply_parser.on("reply", function (reply) {
    self.return_reply(reply);
  });
  // "error" is bad.  Somehow the parser got confused.  It'll try to reset and continue.
  this.reply_parser.on("error", function (err) {
    self.emit("error", new Error("Redis reply parser error: " + err.stack));
  });
};

Redis.prototype.return_error = function (err) {
    var command_obj = this.command_queue.shift(), queue_len = this.command_queue.getLength();

    if (this.pub_sub_mode === false && queue_len === 0) {
        this.command_queue = new Queue();
        this.emit("idle");
    }
    if (this.should_buffer && queue_len <= this.command_queue_low_water) {
        this.emit("drain");
        this.should_buffer = false;
    }

    if (command_obj && typeof command_obj.callback === "function") {
        try {
            command_obj.callback(err);
        } catch (callback_err) {
            // if a callback throws an exception, re-throw it on a new stack so the parser can keep going
            process.nextTick(function () {
                throw callback_err;
            });
        }
    } else {
        console.log("node_redis: no callback to send error: " + err.message);
        // this will probably not make it anywhere useful, but we might as well throw
        process.nextTick(function () {
            throw err;
        });
    }
};

Redis.prototype.return_reply = function (reply) {
  var replyType;
  if (Array.isArray(reply) && reply.length > 0 && reply[0]) {
    replyType = reply[0].toString();
  }

  var associatedCommand;

  var isPubSubMessage = _.includes(['message', 'pmessage'], replyType);
  if (!(this.mode.subscriber && isPubSubMessage)) {
    associatedCommand = this.commandQueue.shift();
  }

  var queueLength = this.commandQueue.length;

  if (this.commandQueue.length === 0) {
    // TODO
    this.commandQueue = new Queue();
  }

  if (associatedCommand && !associatedCommand.subscriber) {
    associatedCommand.resolve(reply);
  } else if (this.mode.subscriber || (associatedCommand && associatedCommand.subscriber)) {
    switch (replyType) {
    case 'message':
      this.emit('message', reply[1].toString(), reply[2]); // channel, message
      break;
    case 'pmessage':
      this.emit("pmessage", reply[1].toString(), reply[2].toString(), reply[3]); // pattern, channel, message
      break;
    case 'subscribe':
    case 'unsubscribe':
    case 'psubscribe':
    case 'punsubscribe':
      if (associatedCommand) {
        associatedCommand.resolve(reply);
      }
      var channel = reply[1].toString();
      var count = reply[2];
      if (count === 0) {
        this.mode.subscriber = false;
        debug('All subscriptions removed, exiting pub/sub mode');
      } else {
        this.mode.subscriber = true;
      }
      this.emit(replyType, channel, count);
      break;
    default:
      this.emit('error', new Error('subscriptions are active but got an invalid reply: ' + reply));
    }
  } else if (this.mode.monitor) {
    var len = reply.indexOf(' ');
    var timestamp = reply.slice(0, len);
    var argindex = reply.indexOf('"');
    var args = reply.slice(argindex + 1, -1).split('" "').map(function (elem) {
      return elem.replace(/\\"/g, '"');
    });
    this.emit('monitor', timestamp, args);
  } else {
    throw new Error("node_redis command queue state error. If you can reproduce this, please report it.");
  }
};

_.assign(Redis.prototype, require('./mixin/commands'));
_.assign(Redis.prototype, require('./mixin/events'));

module.exports = Redis;
