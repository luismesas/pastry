var hero				= require('hero'),
	uuid			= require('node-uuid'),
	utils			= require('./utils');

module.exports = hero.worker(function(self){

	var _dbClient = null;

	// Base config object
	var config = {
		db : {
			host : 'localhost',
			port : 6379,
			type : 'redis',
			params : {}
		},
		cookie : [
			{
				//name		: 'cookie_name',
				//domain	: '',
				//maxAge	: 0
				httpOnly	: true
			}
		]
	};

	var p_config = {};
	config = utils.merge(config, p_config);

	var dbSession = null;

	// app.use(pastry.parseCookies())
	self.parseCookies = function(p_options){
		config = utils.merge(config, p_options);

		if(_dbClient === null){
			var dbSession = self.db(config.prefix, config.db);
			dbSession.setup(function(){
				console.log(config.prefix, 'session database connected to', config.db);
				_dbClient = dbSession.client;
			});
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

				// Obtains sid from cookie
				cookie.sid = cookies[cookie.name+'.sid'];
				cookie.data = {};
				cookie.invalidate = invalidateSession;

				// Creates cookie if does not exists
				if(cookie.sid === undefined){
					cookie.sid = uuid.v4();
					setCookie.push(createCookieString(cookie.name + '.sid', cookie.sid, cookie));
				}

				var obj = {};
				obj.cookie = cookie;
				obj.last = c==C-1;
				obj.next = next;
				obj.reqPause = reqPause;
				obj.req = req;

				// Obtains session data from db
				_dbClient.get(cookie.name+':session:' + cookie.sid, cbkSessionDataRead(obj) );
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
						console.log('set-cookies:', setCookie);
						res.setHeader('Set-Cookie', setCookie);
					}

					saveSessionState(req,res,function(){
						res.end(data, encoding);
					});
				}
			};
		};
	};

	function cbkSessionDataRead(obj){
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
				obj.req.pastry[cookie.name] = cookie;
			}

			if(obj.last){
				obj.next();
				obj.reqPause.resume();
			} else {
			}
		};
	}

	// Saves session state into db
	function saveSessionState(req, res, cbk){
		var c,C = config.cookie.length ,cookie;
		for(c=0; c<C; c++){
			cookie = utils.merge({},config.cookie[c]);

			if(req.pastry[cookie.name].data === null) req.pastry[cookie.name].data = {};

			_dbClient.set(config.prefix+':session:' + req.pastry.sid, JSON.stringify(req.pastry[cookie.name].data), cbkSessionDataWrite(cookie, c==C-1, cbk));
		}
	}

	function cbkSessionDataWrite(cookie, last, cbk){
		return function (err, ret){
			if(err){
				console.log(cookie.name+':', err);
			}
			if(last) cbk();
		};
	}

	// cookie = {
	//	Path : '/',
	//	Domain : ''
	//	maxAge : 0
	// }
	function createCookieString(p_name, p_value, p_options){
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
			expires = new Date(Date.now() + p_options.maxAge);
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

	function invalidateSession(){
		return function(req,res){
			_invalidateSession(req,res);
		}
	}

	function _invalidateSession(req, res){
		res.setHeader('Set-Cookie', createCookieString(config.prefix+'.sid',req.pastry.sid, {maxAge:-1}));
		_dbClient.del(config.prefix+':session:' + req.pastry.sid);
	}

});
