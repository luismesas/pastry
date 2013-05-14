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

// Random token generator
var crypto = require('crypto'); //http://nodejs.org/api/crypto.html
exports.createToken = function(len){
	var tkn = crypto
		.randomBytes(Math.ceil(len * 3 / 4))
		.toString('base64')
		.slice(0, len)
		.replace(/\//g, '-')
		.replace(/\+/g, '_')
	;
	return tkn;
};