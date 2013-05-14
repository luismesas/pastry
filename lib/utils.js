var crypto = require('crypto'); //http://nodejs.org/api/crypto.html

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

// Cipher a string
exports.cipherString = function(data, key){
	var cipher = crypto.createCipher('aes-256-cbc', key);
	var crypted = cipher.update(data,'utf8','hex');
	crypted += cipher.final('hex');
	return crypted;
};

// Decipher a string
exports.decipherString = function(crypted, key){
	var decipher = crypto.createDecipher('aes-256-cbc', key);
	var data = decipher.update(crypted,'hex','utf8');
	data += decipher.final('utf8');
	return data;
};