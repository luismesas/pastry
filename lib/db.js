var mongodb	= require("mongodb"),
	redis	= require("redis");

var dbType = {
	MONGODB	: 'mongodb',
	REDIS	: 'redis'
};

var _db = this;

_db.db = function(p_config){
	var config = p_config;
	var self = this;

	function reset (f_callback){
		switch(config.type){

			case dbType.MONGODB :
				self.client.dropDatabase(f_callback);
				break;

			case dbType.REDIS :
				self.client.flushdb(f_callback);
				break;

		}
	}

	function connection(f_callback) {
		if ( self.client ) {
			f_callback( null, self.client );
		}
		else {
			switch(config.type){
				case hero.dbType.MONGODB :
					if (p_config.uri) {
						mongodb.Db.connect( 
							p_config.uri,
							p_config.params,
							function(err, client) {
								if(err) { 
									console.log(err);
								}
								self.client = client;
								f_callback( err, self.client );
							}
						);
					} 
					else {
						self.client = new mongodb.Db(
							p_config.name,
							new mongodb.Server(p_config.host, p_config.port),
							p_config.params
						);

						self.client.open(
							function(err, p_client) {
								if(err) {
									console.log(err);
								}
								f_callback( err, self.client );
							}
						);
					}
					break;
				
				case hero.dbType.REDIS :
					self.client = redis.createClient(p_config.port, p_config.host, p_config.params);
					f_callback(null, self.client);
					break;
				
				default:
					console.log('database "'+config.type+'" is not supported');
					break;
			}
		}
	}

	function setup(f_callback){
		connection( f_callback );
	}

	self.client = null;
	self.setup  = setup;
	self.reset  = reset;
};

module.exports = _db;
