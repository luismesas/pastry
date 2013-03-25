// Pauses streams
exports.pause = require('pause');

// Merge object b into object a.
exports.merge = function(a, b){
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};