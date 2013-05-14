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
			maxAge : 3600,
			key : '123456789',
			shared : [
				{
					host:'http://local.skbk.es:9998',
					name:'pastry_test_slave1'
				},
				{
					host:'http://local.skbk.es:9997',
					name:'pastry_test_slave2'
				}
			]
		}]
	},
	slave1 : {
		port : 9998,
		cookie : [{
			name : 'pastry_test_slave1',
			domain : '.local.skbk.es',
			maxAge : 3600,
			key : '123456789'
		}]
	},
	slave2 : {
		port : 9997,
		cookie : [{
			name : 'pastry_test_slave2',
			domain : '.local.skbk.es',
			maxAge : 3600,
			key : '123456789'
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

appHost.get('/login', function(req,res){
	var session = req.pastry[config.host.cookie[0].name];
	session.data.uid = 'UID-2';
	session.spread();
});

appHost.listen(config.host.port);
console.log('Host listening on port',config.host.port);

// -----------
// APP SLAVE 1
// -----------
var appSlave1 = express();
appSlave1.use(express.static(__dirname + '/www'));
appSlave1.use(express.bodyParser());
appSlave1.use(pastry.parseCookies({
	cookie: config.slave1.cookie
}));
appSlave1.use(appSlave1.router);

appSlave1.get('/session', function(req,res){
	res.send(200, req.pastry);
});

appSlave1.get('/ps/req/:crypted',function(req,res){
	req.pastry[config.slave1.cookie[0].name].sharingRequest();
});

appSlave1.listen(config.slave1.port);
console.log('Slave1 listening on port',config.slave1.port);

// -----------
// APP SLAVE 2
// -----------
var appSlave2 = express();
appSlave2.use(express.static(__dirname + '/www'));
appSlave2.use(express.bodyParser());
appSlave2.use(pastry.parseCookies({
	cookie: config.slave2.cookie
}));
appSlave2.use(appSlave2.router);

appSlave2.get('/session', function(req,res){
	res.send(200, req.pastry);
});

appSlave2.get('/ps/req/:crypted',function(req,res){
	req.pastry[config.slave2.cookie[0].name].sharingRequest();
});

appSlave2.listen(config.slave2.port);
console.log('Slave2 listening on port',config.slave2.port);
