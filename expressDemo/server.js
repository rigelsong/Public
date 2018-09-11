//uses Express 4.x

//Authentication not implemented in running code here, but if we wanted to we
//we could connect to an OAUTH endpoint and then also implement a callback path 
//the following clips are from my github site

	// let buildEndPoint = AUTH_END_POINT.replace('XX',region);
	// let stateAppend = '';

	// for (let arg of args) {
	// 	stateAppend += '|' + arg.toString();
	// }

	// buildEndPoint += "?client_id=" + CLIENT_ID
	// 	+ "&state=" + encodeURIComponent(getoAuthState() + stateAppend)
	// 	+ "&redirect_uri=" + encodeURIComponent(REDIRECT_URI)
	// 	+ "&response_type=" + "code"
	// 	+ "&force_login=true";

	// return buildEndPoint;

	// if (code && authState === getoAuthState()) {
	// 			//POST to endpoint for authorization token
	// 			request({
	// 			  url: TOKEN_END_POINT.replace('XX',region),
	// 			  method: 'POST',
	// 			  form: {
	// 			  	'redirect_uri' : REDIRECT_URI,
	// 			  	'client_id' : CLIENT_ID,
	// 			  	'client_secret' : CLIENT_SECRET,
	// 			    'grant_type': 'authorization_code',
	// 			    'code' : code
	// 			  }
	// 			}, (err,response)=> {
	// 				let token;

	// 				if (err) {
	// 					req.session.error = 'Error: error retrieving OAuth token ';
	// 					res.status(500);
	// 					res.send('Server error');
	// 					return;
	// 				}

	// 				//log
	// 				console.log(`Response body from token end point: ${response.body}`);

	// 				token = JSON.parse(response.body).access_token;

	// 				//log
	// 			  	console.log(`Access token from ${TOKEN_END_POINT}: ${token}`);

const config = require('./config');
const api = require('./weatherClass');

if (!config.port) {
	console.error('No port configuration found.');
	process.exitCode = 1;
	process.exit();
}

const DAY_MILLISECONDS = 24*60*60*1000;

const fs = require('fs');
const https = require('https');
const url = require('url');
const Url = require('url').URL;
const path = require('path');
const querystring = require('querystring');

//deps
const express = require('express');
const session = require('express-session');
const csurf = require('csurf');
const bodyparser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const request = require('request');

let app = express();
let _users = [];
let region = 'us';
main(app);

function main(app) {

	console.log('Loading Express...');

	  app.set('port', process.env.PORT || config.port);  
	  app.set('views', __dirname + '/views');  
	  app.set('view engine', 'jade');  
	  app.use(bodyparser());
	  app.use(helmet());
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

	  // app.use('/',express.static(path.join(__dirname, 'static')));
	  // console.log('Routing / to: ',path.join(__dirname, 'static'));

	//bind HTTPS
	console.log (`Loading https listener on port ${app.get('port')}`);

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

function setRoutes() {
	console.log('Configuring app routes');

	app.get('/',function(req,res) {
		res.status(200);
		res.send('Weather API Demo');
	});

	app.get('/api/current', function(req,res) {
		let obj = new api.weatherApiFactory(config.env || 'dev');
		obj.getWeather('19120').then( result=> {
			res.status(200);
			res.json(result);
		})
		.catch(err=>{
			res.status(500);
			res.json(err);
		});
	})

	app.get('/api/v1',function(req,res) {
		res.redirect('/api/current');
	});

	app.get('/login',function(req,res) {
		res.redirect('/');
	});

	app.get('/logout',function(req,res) {
		req.session.destroy(function(){
			res.clearCookie('token');
			res.clearCookie('sessionId');
			res.redirect('/');
		});
	});

}
