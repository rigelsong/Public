var provider = require('./oAuthProvider');
if (!provider) {
	console.error('No oAuthProvider configuration found.');
	process.exitCode = 1;
	process.exit();
}

const CLIENT_ID = provider.clientId;
const CLIENT_SECRET = provider.clientSecret;
const REDIRECT_URI = provider.redirectUri;
const AUTH_END_POINT = provider.authEndPoint;
const TOKEN_END_POINT = provider.tokenEndPoint;
const API_END_POINT_USER = provider.apiEndPointUserName;
const API_END_POINT_USER_KEY = provider.apiEndPointUserKey;
const TOKEN_LIFETIME_DAYS = provider.tokenLifeTimeDays;
const DAY_MILLISECONDS = 24*60*60*1000;

const fs = require('fs');
const https = require('https');
const url = require('url');
const Url = require('url').URL;
const path = require('path');
const querystring = require('querystring');
const playerData = require('./updatePlayers');


//Express 4.x decoupled from connect and uses separate middleware as per below
const express = require('express');
const session = require('express-session');
const csurf = require('csurf');
const bodyparser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const request = require('request');

//todo: favicon png to be served
//const favicon = require('serve-favicon');

let app = express();
let _users = [];
let oAuthState = 'xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);});
let region = 'us';
main(app);

function main(app) {

	//global config
	console.log('Loading Express for ',provider.application);

// app.config(()=> {  
	  app.set('port', process.env.PORT || 8443);  
	  app.set('views', __dirname + '/views');  
	  app.set('view engine', 'jade');  
	  //app.use(favicon());  
	  //app.use(express.logger('dev'));  
	  app.use(bodyparser());
	  app.use(helmet());
	  // app.use(helmet.xframe());  
	  // app.use(helmet.iexss());  
	  // app.use(helmet.contentTypeOptions());  
	  // app.use(helmet.cacheControl());  
	  app.use(methodOverride());  
	  app.use(enableCrossDomain);

	  app.use(cookieParser());  
	  app.use(session({  
		secret : 'fjgj34jirutrpt',
	    cookie: {httpOnly: true, secure: true},  
	  }));
	
	  app.use(csurf());  
  	  app.use((req, res, next)=> {  
	    res.locals.csrftoken = req.session._csrf;  
	    next();  
	  });

	  setRoutes();  

	  app.use('/',express.static(path.join(__dirname, 'static')));
	  console.log('Routing / to: ',path.join(__dirname, 'static'));


// });

	//bind HTTPS
	console.log('Binding to HTTPS on port ',app.get('port'));

	let privateKey = fs.readFileSync( './selfsign.key' );
	let certificate = fs.readFileSync( './selfsign.crt' );
	https.createServer({
	    key: privateKey,
	    cert: certificate
	}, app).listen(app.get('port'));


}

function enableCrossDomain(req,res,next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
}


function addUser(user) {
	if (_users.indexOf(user) === -1) {
		_users.push(user);
	}
}

function findUser(user) {
	return _users.indexOf(user);
}

function deleteUser(user) {
	let deletePos = findUser(user);
	if (deletePos !== -1) {
		_users.splice(deletePos,1);0
	}
}

function getoAuthState() {
	return oAuthState;
}


function buildEndPoint(...args) {

	let buildEndPoint = AUTH_END_POINT.replace('XX',region);
	let stateAppend = '';

	for (let arg of args) {
		stateAppend += '|' + arg.toString();
	}

	buildEndPoint += "?client_id=" + CLIENT_ID
		+ "&state=" + encodeURIComponent(getoAuthState() + stateAppend)
		+ "&redirect_uri=" + encodeURIComponent(REDIRECT_URI)
		+ "&response_type=" + "code"
		+ "&force_login=true";

	return buildEndPoint;
}


function setRoutes() {
	//routes
	console.log('Configuring app routes');


	app.param('playerId',(req,res,next,playerId)=>{
		req.playerId = playerId.split(',');
		return next();
	})

	app.get('/auth', (req,res)=> {
			res.status(403);
			res.send('Forbidden');
	})


	app.get('/auth/battlenet', (req,res)=> {
			res.status(403);
			res.send('Forbidden');
	})


	app.get('/stats', (req,res)=> {
		//requires auth
		if (!req.cookies.userName) {
			res.redirect(buildEndPoint('/stats'));
		}

		if (req.cookies.userName) {

			playerData.getPlayers([req.cookies.userName])
			.then((result)=>{
				res.status(200);
				res.json(result);
			})
			.catch((err)=>{
				res.status(500);
				res.send('Error occurred while retrieving stats');
				console.error(`Err: ${err}`);	
			})
		}
	})

	app.get('/stats/:playerId', (req,res,next)=> {

		if (req.playerId) {
			playerData.getPlayers([...req.playerId])
			.then((result)=>{
				res.status(200);
				res.json(result);
			})
			.catch((err)=>{
				res.status(500);
				res.send(`Error occurred while retrieving stats for ${req.playerId}`);
				console.error(`Err: ${err}`);	
			})
		}
	})



	app.get('/auth/battlenet/geturl',(req,res)=> {
		res.status(200);
		res.json({endPoint : buildEndPoint()});
	})


	app.get('/auth/battlenet/callback', (req,res)=> {
		//grant_type is Authorization Code
		if (provider.type === 'Authorization') {
			let {code,state} = req.query;
			let [authState,redirect] = decodeURIComponent(state).split('|');

			if (!(code && authState === getoAuthState())) {
				req.session.error = 'Error: Unable to authenticate via Oauth';
				res.status(403);
				res.send('Forbidden');
			}

			if (code && authState === getoAuthState()) {
				//POST to endpoint for authorization token
				request({
				  url: TOKEN_END_POINT.replace('XX',region),
				  method: 'POST',
				  form: {
				  	'redirect_uri' : REDIRECT_URI,
				  	'client_id' : CLIENT_ID,
				  	'client_secret' : CLIENT_SECRET,
				    'grant_type': 'authorization_code',
				    'code' : code
				  }
				}, (err,response)=> {
					let token;

					if (err) {
						req.session.error = 'Error: error retrieving OAuth token ';
						res.status(500);
						res.send('Server error');
						return;
					}

					//log
					console.log(`Response body from token end point: ${response.body}`);

					token = JSON.parse(response.body).access_token;

					//log
				  	console.log(`Access token from ${TOKEN_END_POINT}: ${token}`);

				  	if (token) {
				  		//GET from USER API
				  		request({
						  url: API_END_POINT_USER.replace('XX',region) + token,
						  method: 'GET'
						}, (err,apiResponse)=> {

							let userName;
							if (err) {
								req.session.error = 'Error: unable to access API';
								res.status(500);
								res.send('Server error');
								return;
							}

							userName = JSON.parse(apiResponse.body)[API_END_POINT_USER_KEY];

							res.cookie('access_token',token,{maxAge : TOKEN_LIFETIME_DAYS * DAY_MILLISECONDS,httpOnly:false,path:'/'});
							res.cookie('userName',userName,{maxAge : TOKEN_LIFETIME_DAYS * DAY_MILLISECONDS,httpOnly:false,path:'/'});

							if (redirect) {
								res.redirect(redirect);
							} else res.redirect('/');

							// req.session.regenerate(()=>{
							// 	res.cookie('access_token',token,{maxAge : TOKEN_LIFETIME_DAYS * DAY_MILLISECONDS,httpOnly:false,path:'/'});
							// 	res.cookie('userName',userName,{maxAge : TOKEN_LIFETIME_DAYS * DAY_MILLISECONDS,httpOnly:false,path:'/'});
						 // 		// res.status(200);
						 // 		// res.send('OK');
						 // 		res.redirect('/');
							// });
						})	
				  	}
				});
			}
		}
	})


	app.get('/login',function(req,res) {
		res.redirect('/');
	});

	app.get('/logout',function(req,res) {
		req.session.destroy(function(){
			res.clearCookie('access_token');
			res.clearCookie('userName');
			res.redirect('/');
		});
	});

	// app.get('/',function(req,res) {
	// 	console.log('Received: ',req.url);
	// 	// console.log("GET / received.\n");

	// 	if (req.cookies.userName) {
	// 		addUser(req.cookies.userName);

	// 		//req.session.user = req.cookies.username;	
	// 	}
	//     //console.log('User is: ',req.session.user);

	//     res.redirect('/app');

	// });

}



/*
				  	// probably does not exist for OW, see res.body

				  	// GET to API to retrieve user name and metadata
				  	// APIEndPointAccess = API_END_POINT_USER_NAME + '&bearer_token=' + token;

				 	//console.log(`Getting username from ${APIEndPointAccess}`);

				 	//  request({
					//   url: APIEndPointAccess,
					//   method: "GET",
					//   timeout: API_END_POINT_TIMEOUT,
					//   followRedirect: true,
					//   maxRedirects: 10
					// }, (err,res) => {
					// 	if (err) {
					// 		req.session.error = 'Error: unable to access API ';
					// 		res.status(500);
					// 		res.send('Server error');
					// 		return;
					// 	}
					// 	//ck
					//   	userName = JSON.parse(res.body).user;
					// });

// var db = (function() {

// 	return {getPassword : getPassword};

// 	function getPassword(user,callback) {

// 		Idb.get('SiteUsers',{user : user, app_id : 1})
// 		.then(function(result){
// 			var data = result.data;
// 			callback(data.pwd);
// 		})
// 		.catch(function(err){
// 			callback(null);
// 		})
// 	}
// })();


// app.post('/db',function(req,res){
// 	console.log('Db request received.');
// 	var user = req.body.username;
// 	var bg_url = req.body.bg_url;
// 	var searchedFor = req.body.searchedFor;

// 	if (req.body.action === 'put' && findUser(user) && bg_url && searchedFor) {
// 		console.log('Put received from ',user);
// 		var doc = {"user" : user, app_id: 1, "prefs" : { "bg_url" : bg_url, "searchedFor" : searchedFor } }
// 		Idb.put('SiteData',{user : user},doc)
// 		.then(function(result){
// 			res.status(200);
// 	 		res.send('ok');
// 		})
// 		.catch(function(err){
// 			req.session.error = 'Unable to save data user preferences.';
// 			res.status(500);
// 			res.send(req.session.error);
// 		})
// 	} else {
// 		res.status(403);
// 		res.send('Forbidden');
// 	}
// });

// app.post('/login',function(req,res){
// 	console.log('Post login received');
// 	var user = req.body.username;
// 	var pwd = req.body.password;
// 	console.log('user: ',user, ' pwd: ', pwd);
	
// 	if (user && pwd) {
// 		db.getPassword(user,function(dbPwd) {
// 			if (pwd === dbPwd) {
// 				req.session.regenerate(function(){
// 					addUser(user);
// 					res.cookie('username',user,{maxAge : 24*60*60*1000,httpOnly:false,path:'/'});
// 			 		res.status(200);
// 			 		res.send('ok');
// 				});
// 			} else {
// 				req.session.regenerate(function(){
// 					req.session.error = 'Could not login with this username and password.';
// 					res.status(401);
// 					res.send(req.session.error);
// 				});	
// 			}
// 		})
// 	} else {
// 		req.session.error = 'Must supply both username and password.';
// 		res.status(401);
// 		res.send(req.session.error);
// 	}
// });

// app.get('/match',function(req,res) {

// 	console.log(`GET /match received.\n`);
// 	//TODO: cookies.username
// 	var returnVal = [];
// 	Idb.get('stats',{platform : 'pc',region: 'us',hero:'All_Heroes',category:'Competitive'}, 4).then(function(result) {
// 		if (result.data && Array.isArray(result.data)) {
// 			result.data.forEach(function(item,position){
// 				returnVal.push({playerId : item.key, 'Time on Fire - Average' : item.stats["Time Spent on Fire - Average"], preview : 'card.png'});
// 			})
// 		}
// 		res.json(returnVal);
// 	})
// 	.catch(function(error){
// 		res.json({error : error});
// 	})
// });

	// Idb.config(dbConfig);
	// Idb.recycleDb();
	// var interval = setInterval(Idb.recycleDb,1000*60*5);
	//app.use('/app',express.static('./static/'));



// const API_END_POINT_USER_NAME = provider.userNameEndPoint;
// const API_END_POINT_TIMEOUT = provider.APITimeOut;
// var dbConfig = require('./dbConfig');
// var Idb = require('../lib/inventoryDb.js');

*/
