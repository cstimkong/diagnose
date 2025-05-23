var async = require('async');

async.waterfall([
    function (callback) {
        getSomething(options, function (err, result) {
          if (err) {
            callback(new Error("failed getting something:" + err.message));
            // we should return here
          }
          // since we did not return, this callback still will be called and
          // `processData` will be called twice
          callback(null, result);
        });
    },
    processData
], done)