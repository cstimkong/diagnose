var async = require('async');
var fs = require('fs');
var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
var configs = {};

async.forEachOf(obj, function (value, key, callback) {
  fs.readFile(__dirname + value, "utf8", function (err, data) {
    if (err) return callback(err);
    try {
      configs[key] = JSON.parse(data);
    } catch (e) {
      return callback(e);
    }
    callback();
  })
}, function (err) {
  if (err) console.error(err.message);
  // configs is now a map of JSON data
  doSomethingWith(configs);
})