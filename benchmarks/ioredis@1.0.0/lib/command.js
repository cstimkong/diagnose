function Command (commandName, args, callback) {
  this.commandName = commandName;
  this.args = args;
  this.callback = callback;
  this.subscriber = ['subscribe', 'psubscribe', 'unsubscribe', 'punsubscribe'].indexOf(commandName) !== -1;
}

Command.prototype.toString = function () {
  return Command.multiBulk([commandName].concat(this.args));
};

Command.prototype.resolve = function (value) {
  this.callback(null, value);
};

Command.prototype.reject = function (err) {
  this.callback(err);
};

Command.prototype.promise = function () {
  if (this.callback) {
    return null;
  }

  var _this = this;
  return new Promise(function (resolve, reject) {
    _this.resolve = resolve;
    _this.reject = reject;
  });
};

Command.multiBulk = function (values) {
  var str = '*' + values.length + '\r\n';
  for (var i = 0; i < values.length; ++i) {
    str += this.bulk(values[i]);
  }
  return str;
};

Command.bulk = function (value) {
  return '$' + Buffer.byteLength(value) + '\r\n' + value + '\r\n';
};

module.exports = Command;
