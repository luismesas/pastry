var redis	= require('redis'),
utils	= require('./utils');

var self = this;
module.exports = self;

// app.use(pastry.parseCookies())
self.parseCookies = function(p_options){
	var _dbClient = null;

	// Base config object
	var config = {
		db : {
			host : 'localhost',
			port : 6379,
			options : {}
		},
		cookie : [{
			//name		: 'cookie_name',
			//domain	: '',
			//maxAge	: 0
			httpOnly	: true
		}]
	};

	var p_config = {};
	config = utils.merge(config, p_config);

	var dbSession = null;

	config = utils.merge(config, p_options);

	if(_dbClient === null){
		_dbClient = redis.createClient(config.db.port, config.db.host, config.options);
		console.log('pastry', 'session database connected to', config.db);
	}

	return function (req, res, next){
		// Creates base object 
		req.pastry = {};

		// Obtains cookies from request
		var cookies = _getCookies(req.headers.cookie);
		var setCookie = [];

		var reqPause = utils.pause(req);

		var c,C = config.cookie.length, cookie;
		for(c=0; c<C; c++){
			cookie = utils.merge({},config.cookie[c]);
			req.pastry[cookie.name] = cookie;

			// Obtains sid from cookie
			cookie.sid = cookies[cookie.name+'.sid'];
			cookie.data = {};
			cookie.invalidate = _invalidateSession(cookie);

			// Creates cookie if does not exists
			if(cookie.sid === undefined){
				cookie.sid = utils.createToken(128);
				setCookie.push(_createCookieString(cookie.name + '.sid', cookie.sid, cookie));
			}

			var obj = {};
			obj.cookie = cookie;
			obj.last = c==C-1;
			obj.next = next;
			obj.reqPause = reqPause;
			obj.req = req;

			// Obtains session data from db
			var key = cookie.name+':session:' + cookie.sid;
			_dbClient.get(key, _cbkSessionDataRead(obj));
		}

		// proxy end() to save the session
		var end = res.end;
		res.end = function(data, encoding){
			res.end = end;
			if(res.statusCode == 404){
				res.end(data, encoding);
			} else {
				// Sends Set-Cookie headers of needed
				if(setCookie.length>0){
					res.setHeader('Set-Cookie', setCookie);
				}

				_saveSessionState(req,res,function(){
					res.end(data, encoding);
				});
			}
		};
	};

	function _cbkSessionDataRead(obj){
		return function (err, data){
			var cookie = obj.cookie;

			if(err){
				console.log(cookie.name+':', err);
			} else {
				cookie.data.sid = cookie.sid;
				if(data !== undefined && data !== null){
					var dataParsed = JSON.parse(data);
					if(dataParsed !== null){
						cookie.data = dataParsed;
					}
				}
			}

			if(obj.last){
				obj.next();
				obj.reqPause.resume();
			}
		};
	}

	// Saves session state into db
	function _saveSessionState(req, res, cbk){
		var c,C = config.cookie.length ,cookie;
		for(c=0; c<C; c++){
			cookie = utils.merge({},config.cookie[c]);

			if(req.pastry[cookie.name].data === null) req.pastry[cookie.name].data = {};

			var key = cookie.name+':session:' + req.pastry[cookie.name].sid;
			_dbClient.set(key, JSON.stringify(req.pastry[cookie.name].data), _cbkSessionDataWrite(cookie, c==C-1, cbk));
			if(cookie.maxAge > 0) _dbClient.expire(key, cookie.maxAge);
		}
	}

	function _cbkSessionDataWrite(cookie, last, cbk){
		return function (err, ret){
			if(err){
				console.log(cookie.name+':', err);
			}
			if(last) cbk();
		};
	}

	function _createCookieString(p_name, p_value, p_options){
		var cookie = [];
		cookie[cookie.length] = p_name + '=' + p_value + ';' +
		' Path=' + (p_options.Path === undefined ? '/' : p_options.path) + ';';

		// Domain restriction
		if(p_options.domain !== undefined){
			cookie[cookie.length] = ' Domain='+ p_options.domain+';';
		}

		// Expiry
		var expires = null;
		if(p_options.maxAge >= -1){
			expires = new Date(Date.now() + p_options.maxAge * 1000);
			cookie[cookie.length] = ' Expires=' + expires.toGMTString() + ';';
		}

		// httpOnly restriction
		if(p_options.httpOnly === undefined || p_options.httpOnly){
			cookie[cookie.length] = ' httponly;';
		}

		return cookie.join('');
	}

	function _getCookies(p_cookies){
		var regex	= /(([^= ]*)=([^;]*))/g,
		matches = [],
		cookies = {};

		if ( p_cookies ) {
			matches = regex.exec( p_cookies );
			while (matches) {
				cookies[matches[2]] = matches[3];
				matches = regex.exec( p_cookies );
			}
		}
		return cookies;
	}

	function _invalidateSession(cookie){
		return function(req,res){
			res.setHeader('Set-Cookie', _createCookieString(config.prefix+'.sid',req.pastry[cookie.name].sid, {maxAge:-1}));
			_dbClient.del(config.prefix+':session:' + req.pastry[cookie.name].sid);
		};
	}
};
