//PUTTS
//ANSON CHAN trango812@gmail.com

//Simple PUT/GET access to Mongo Database, or JSON database of choice
//Database client checked by interval, users will reuse single utility login

/*
login				// login using username and password
get(dataset,query)	// retrieves matchingdoc with query from dataset
put(dataset,query,doc)  //updates dataset with doc for matching query, inserts if doc does not already exist
logout				// logout and deactivate session id
*/

// Loosely wire back end, use mongoDb for now
var DbClient = require('mongodb').MongoClient;
var DbLoginFn = DbClient.connect;
var DbGetFn = "collection";
var DB_CURSOR_DEFAULT_PAGE_ROWS = 100;
var DB_CURSOR_NO_LIMIT = 0;

//Read in by _config
var DbProtocol = 'mongodb://';
var DbHost = 'localhost';
var DbPort = '27017';
var DbDatabase = 'test';
var DbLogin = {username: 'dbadmin',pwd: 'test'};
var DBDefaultObject = 'DogFood';

//Internals
var _sessions = {};
var debug = true;

//Http  require('http');
//TODO: implement res-ponse writes
var Http = (function() {
	
	resOut = function(res,out){

		console.log(out.data,out.session);

		// res.writeHeader(headerInfo);
		// res.write(out);
		// res.end();
	}

	return {resOut : resOut};
})();
 

//Utility fns
var Util = (function() {

	//Thanks to stackexchange for this nugget
	createGUID = function() {
	    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
	        return v.toString(16);
	    });
	};

	return {createGUID : createGUID};
})();

function _od(o) {
	if (debug) {
		console.log(o);
	}
}


//Idb API
var Idb = (function() {

	_config = function(config) {
		if (config) {
			try {
				DbProtocol = config.DbProtocol;
				DbHost = config.DbHost;
				DbPort = config.DbPort;
				DbDatabase = config.DbDatabase;
				DbLogin = config.DbLogin;
				DBDefaultObject = config.DBDefaultObject;				
			}
			catch (err) {
				throw 'Idb: error processing database configuration JSON: ' + err.toString();
			} 
		}
	}

	_findSessionByUsername = function(username) {
		var result;
		// console.log(`_sessions : ${JSON.stringify(_sessions)}`);
		for (var session in _sessions) {
					if (_sessions.hasOwnProperty(session)) {
						if (_sessions[session].user === username) {
							result = session;
							break;
						}
					}
				}
		return result;
	}

	_recycleDb = function() {

		var currentSession;
		currentSession = _findSessionByUsername(DbLogin.username);

			if (currentSession) {
				_od('Verifying current db connection...');
				var db = _sessions[currentSession].db;
				_openDataset(db,DBDefaultObject)
					.then(function(result) {
						_od('Database connection ok.');
						return true;
					})
					.catch(function(error) {
							_od('Current connection is invalid: ',error);
							_sessions.delete(currentSession);

							_od('Creating new database connection...');
							_login(DbLogin.username,DbLogin.pwd)
							.then(function(db){
								return _openDataset(db,DBDefaultObject);
							})
							.then(function(result){
								_od('Database connection ok.');
								return true;
							})
							.catch(function(error){
								_od('Unable to connect to database: ',error);
								return false;
							})
					})
			} else {
					_od('Connecting to database...');
					_login(DbLogin.username,DbLogin.pwd)
					.then(function(db){
						return _openDataset(db,DBDefaultObject);
					})
					.then(function(result){
						_od('Database connection ok.');
						return true;	//session
					})
					.catch(function(error){
						_od('Unable to connect to database: ',error);
						return false;
					})
			}

	}


	_getSession = function() {

		return new Promise(function(resolve,reject) {
			var currentSession;
			currentSession = _findSessionByUsername(DbLogin.username);
			
			if (currentSession) {
				resolve(currentSession);
			} else {
				reject('Database offline, please try again in a few minutes.');
			}
		});
	}


	_login = function(user,password,debugObj) {

		return new Promise(function(resolve,reject) {

				if (!user || !password) {
					user = DbLogin.username;
					password = DbLogin.pwd;
				}
				
				DbLoginFn.call(this, DbProtocol + user + ":" + password + "@" + DbHost + ":" + DbPort + "/",function(err,db) {
				if (!err) {
					var session = Util.createGUID();
					var setDb = db.db(DbDatabase);

					_sessions[session] = {user : user, db : setDb};
					out =  {success : 1, data : {message : 'Logged in as ' + user}, session : session};
_od(out);
					resolve(setDb);
					
				} else {
						out = { success : 0, data : {message:err}, session: null};
						_od(out);
						if (debugObj) {
							debugObj.value = out;
						}
						reject(err);	
				}
			});
					});

	}

	_openDataset = function(db,dbObject) {
		return new Promise(function(resolve,reject) {
			if (!dbObject) dbObject = DBDefaultObject;
			db[DbGetFn](dbObject,function(err,dataset) {
				if (err) reject(err);
				if (!err) resolve(dataset);
			})
		});
	}


	_putDataset = function(dataset, query, doc, options, bulk, replace) {
		return new Promise(function(resolve,reject) {
			var updateArg;
			if (bulk && Array.isArray(doc)) {
				if (replace) {
					dataset.remove(query,false,function(err,result) {
						if (err) reject(err);
						if (!err) {
							dataset.insertMany(doc,options,function(err,result) {
								if (err) reject(err);
								if (!err) resolve(result);
							})
						}
					})	
				} else {
					dataset.insertMany(doc,options,function(err,result) {
								if (err) reject(err);
								if (!err) resolve(result);
					})
				}
			} else {

				dataset.update(query,doc,options,function(err,result) {
							if (err) reject(err);
							if (!err) resolve(result);
				})
			}
		});
	}

	_getDataset = function(dataset, query, count) {
		return new Promise(function(resolve,reject) {
			if (count === undefined) count = 1;
			if (count > 1) {
				dataset.find(query).limit(count).toArray(function(err,items) {
					if (err) reject(err);
					if (!err) resolve(items);
				})
			} else {
				dataset.findOne(query,function(err,item) {
					if (err) reject(err);
					if (!err) {resolve(item)};
				});
			}
		});
	}


	_findDataset = function(dataset, query, page, pageRows, sizeOnly) {
		return new Promise(function(resolve,reject) {
				if (page === undefined) page = 1;
				if (pageRows === undefined) pageRows = DB_CURSOR_NO_LIMIT;
				if (sizeOnly === undefined) sizeOnly = false;

				if (sizeOnly) {
					dataset.count(query,function(err,count) {
						if (err) {
							reject('Unable to determine collection size.');
						} else {
							resolve(count);
						}
					});
				} else {
					dataset.find(query).skip(page > 1 ? pageRows * (page - 1) : 0).limit(pageRows).toArray(function(err,arr) {
						if (err) reject(err);
						if (!err) {
							resolve(arr)
						}
					});
				}
			});
		}

	put = function(dataset,query,doc,bulk,replace) {
		return new Promise(function(resolve,reject){
			var out = {success : 0, data: null, session: null};
			var options;
			if (dataset && query && doc) {
				if (bulk === undefined) bulk = false;
				if (replace === undefined) replace = false;
				_getSession().then(function(session){
					var db = _sessions[session].db;
					_openDataset(db,dataset).then(function(cursor) {
						if (!bulk) {
							options = {upsert: true, w:1, j:1, multi : false};  //options = {w:1, j: 1};
						} else { 
							options = {ordered : false, w:1};
						}
						return _putDataset(cursor,query,doc,options,bulk,replace);
					})
					.then(function(result){
						out = { success : 1, data : result, session: session }; 
 // _od(out);
						resolve(out);
					})
					.catch(function(err) {
						out = { success : 0, data : err, session: session }; 
						_od(out);
						reject(out);
					})
				})
				.catch(function(err){
					out = { success : 0, data : err, session: session }; 
					_od(out);
					reject(out);
				})
			} else reject(out);
		});		
	}


	get = function(dataset,query,count) {
		return new Promise(function(resolve,reject){
			var out = {success : 0, data: null, session: null};
			if (dataset) {
				if (query === undefined) query = {};
				if (count === undefined) count = 1024;
				_getSession().then(function(session){
					var db = _sessions[session].db;
					_openDataset(db,dataset).then(function(cursor) {
						return _getDataset(cursor,query,count);
					})
					.then(function(result){
						out = { success : 1, data : result, session: session }; 
// _od(out);			
						resolve(out);
					})
					.catch(function(err) {
						out = { success : 0, data : err, session: session }; 
						_od(out);
						reject(out);
					})
				})
				.catch(function(err){
					console.log(`Session was rejected as: ${err}`);
					out = { success : 0, data : err, session: null }; 
// _od(out);
					reject(out);
				})
			} else reject(out);
		});
	}

	find = function(dataset,query, page, pageRows, sizeOnly) {
		return new Promise(function(resolve,reject){
			var out = {success : 0, data: null, session: null};
			if (dataset) {
				if (query === undefined) query = {};
				if (page === undefined) page = 1;
				if (pageRows === undefined) pageRows = DB_CURSOR_NO_LIMIT;
				if (sizeOnly === undefined) sizeOnly = false;
				_getSession().then( function(session) {
					var db = _sessions[session].db;
					_openDataset(db,dataset).then(function(cursor) {
						return _findDataset(cursor,query, page, pageRows, sizeOnly);
					})
					.then(function(result){
						out = { success : 1, data : result, session: session }; 
						resolve(out);
					})
					.catch(function(err) {
						out = { success : 0, data : err, session: session }; 
						_od(out);
						reject(out);
					})
				})
				.catch(function(err){
					out = { success : 0, data : err, session: null }; 
					_od(out);
					reject(out);
				})
			} else reject(out);
		});
	}

	_logout = function () {
		
		var session = _findSessionByUsername(DbLogin.username);

		if (session) {
			var db = _sessions[session].db;
			try {
				db.close();
				delete _sessions[session];
				out = { success : 1, data : {message : 'Connection closed.'}, session: session }; 
				return out;
			}
			catch (ex) {
				out = { success : 0, data : {message : ex}, session: session }; 
				return out;
			}

		} else {
			out = { success : 0, data : {message : 'Primary database user not logged in.'}, session: null }; 
			return out;
		}
	}

	//API to global namespace
	return {config : _config,
			login : _login,
			get : get,
			put : put,
			find : find,
			logout : _logout,
			recycleDb : _recycleDb
		};
})();



module.exports = Idb;





