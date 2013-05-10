var hero				= require('hero'),
	uuid			= require('node-uuid'),
	utils			= require('./utils');

module.exports = hero.worker(function(self){

	var _dbClient = null;

	// Base config object
	var config = {
		prefix : 'pastry',
		db : {
			host : 'localhost',
			port : 6379,
			type : 'redis',
			params : {}
		},
		cookie : {
			//Domain	: '',
			//MaxAge	: 0
            httpOnly	: true
		}
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

			// Obtains sid from cookie
			var cookies = _getCookies(req.headers.cookie);
			req.pastry.sid = cookies[config.prefix+'.sid'];
			req.pastry.data = {};
			req.pastry.invalidate = function(){
				_invalidateSession(req,res);
			};

			// Creates cookie if does not exists
			if(req.pastry.sid === undefined){
				req.pastry.sid = uuid.v4();
				res.setHeader('Set-Cookie', createCookieString(config.prefix + '.sid', req.pastry.sid, config.cookie));
			}

			var reqPause = utils.pause(req);
			// Obtains session data from db
			_dbClient.get(config.prefix+':session:' + req.pastry.sid, function(err, data){
				if(err){
					console.log(config.prefix+':', err);
				} else {
					req.pastry.data.sid = req.pastry.sid;
					if(data !== undefined && data !== null){
						var dataParsed = JSON.parse(data);
						if(dataParsed !== null){
							req.pastry.data = dataParsed;
						}
					}
				}
				next();
				reqPause.resume();
			});

			// proxy end() to save the session
			var end = res.end;
			res.end = function(data, encoding){
				res.end = end;
				saveSessionState(req,res,function(){
					res.end(data, encoding);
				});
			};
		};
	};

	// Saves session state into db
	function saveSessionState(req, res, cbk){
		if(req.pastry.data === null) cbk();

		_dbClient.set(config.prefix+':session:' + req.pastry.sid, JSON.stringify(req.pastry.data), function(err,ret){
			if(err){
				console.log(config.prefix+':', err);
			}
			cbk();
		});
	}

	// cookie = {
	//	Path : '/',
	//	Domain : ''
	//	MaxAge : 0
	// }
	function createCookieString(p_name, p_value, p_options){
		var cookie = [];
		cookie[cookie.length] = p_name + '=' + p_value + ';' +
			' Path=' + (p_options.Path === undefined ? '/' : p_options.path) + ';';

		// Domain restriction
		if(p_options.Domain !== undefined){
			cookie[cookie.length] = ' Domain='+ p_options.Domain+';';
		}

		// Expiry
		var expires = null;
		if(p_options.MaxAge >= 0){
			expires = new Date(Date.now() + p_options.MaxAge);
			cookie[cookie.length] = ' Expires=' + expires.toGMTString() + ';';
		} else if(p_options.MaxAge == -1) {
			expires = new Date(0);
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

	function _invalidateSession(req, res){
		res.setHeader('Set-Cookie', createCookieString(config.prefix+'.sid',req.pastry.sid, {MaxAge:-1}));
		_dbClient.del(config.prefix+':session:' + req.pastry.sid);
	}

});
