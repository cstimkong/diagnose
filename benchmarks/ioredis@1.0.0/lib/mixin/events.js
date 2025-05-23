exports.onConnect = function () {
  var _this = this;
  if (this.options.readyCheck) {
    this.status = 'connecting';
  } else {
    isConnected();
  }
  this.commandQueue = [];
  // TODO
  this.emitted_end = false;
  if (this.options.socket_nodelay) {
      this.stream.setNoDelay();
  }
  this.stream.setKeepAlive(this.options.socket_keepalive);
  this.stream.setTimeout(0);

  this.initParser();

  if (this.options.auth) {
    this.auth(this.options.auth, function (err) {
      if (err.toString().match('no password is set')) {
        console.warn('Warning: Redis server does not require a password, but a password was supplied.');
        err = null;
        res = "OK";
      } else {
        return _this.emit('error', new Error('Auth error: ' + err.message));
      }
      if (res.toString() !== 'OK') {
        return _this.emit('error', new Error('Auth failed: ' + res.toString()));
      }
      isConnected();
    });
  } else {
    isConnected();
  }

  function isConnected() {
    _this.status = 'connected';
  }
};

exports.onData = function () {
  try {
    this.reply_parser.execute(data);
  } catch (err) {
    // This is an unexpected parser problem, an exception that came from the parser code itself.
    // Parser should emit "error" events if it notices things are out of whack.
    // Callbacks that throw exceptions will land in return_reply(), below.
    // TODO - it might be nice to have a different "error" event for different types of errors
    this.emit("error", err);
  }
};

exports.onError = function (error) {
  this.emit('error', error);
};

exports.onClose = function () {
};

exports.onEnd = function () {
};

exports.onDrain = function () {
  this.emit('drain');
};
