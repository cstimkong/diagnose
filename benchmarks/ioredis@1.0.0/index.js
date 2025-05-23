module.exports = require('./lib/redis');


var Redis = module.exports;

var redis = Redis();

redis.get('foo', function (err, b) {
  console.log(err, b);
});
