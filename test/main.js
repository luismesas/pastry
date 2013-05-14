var express = require('express');
var pastry = require('../lib/pastry');

// ------
// Config
// ------
var config = {
	host : {
		port : 9999,
		cookie : [{
			name : 'pastry_test_host',
			domain : '.local.skbk.es',
			maxAge : 3600
		}]
	},
	slave : {
		port : 9998,
		cookie : [{
			name : 'pastry_test_slave',
			domain : '.local.skbk.es',
			maxAge : 3600
		}]
	}
};

// --------
// APP HOST
// --------
var appHost = express();
appHost.use(express.static(__dirname + '/www'));
appHost.use(express.bodyParser());
appHost.use(pastry.parseCookies({
	cookie: config.host.cookie
}));
appHost.use(appHost.router);

appHost.get('/session', function(req,res){
	res.send(200, req.pastry);
});

appHost.listen(config.host.port);
console.log('App host listening on port',config.host.port);

// ---------
// APP SLAVE
// ---------
var appSlave = express();
appSlave.use(express.static(__dirname + '/www'));
appSlave.use(express.bodyParser());
appSlave.use(pastry.parseCookies({
	cookie: config.slave.cookie
}));
appSlave.use(appSlave.router);

appSlave.get('/session', function(req,res){
	res.send(200, req.pastry);
});

appSlave.listen(config.slave.port);
console.log('App slave listening on port',config.slave.port);
