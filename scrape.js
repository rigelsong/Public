// scrape.js

/* Usage:
usage: var bounds = require('./project_bounds');
var urls = require('./project_url');
var scr = require('../lib/scrape');
scr.scrape(urls,bounds,function cb(){}));
*/

var request = require('request');
var agent = require('socks5-https-client/lib/Agent');
var urlLib = require('url');
var regs,cats,bounds;

var HTTP_GET_TIMEOUT = 2 * 60 * 1000;
var HTTP_GET_RETRIES = 3;

var scrapeObj = (function() {
	var _result = [];
	var _mapResult = new Map();


	_config = function(config) {
		if (config) {
			try {
				regs = config.regs;
				cats = config.cats;
				bounds = config.bounds;
				return true;
			}
			catch (err) {
				console.log('scrape: error processing configuration JSON: ' + err.toString());
				return false;
			} 
		} else return false;
	}

	_value = function() {
		return _mapResult;
	}

	_scrape = function(urls,bounds,cb) {

		_result = [];
		_mapResult = new Map();

		var _scrapeStart = new Date().getTime();
		var _scrapeEnd;
		if (![urls,bounds].every((arr) => { return (arr && Array.isArray(arr));})) {
			console.log(`_scrape: Invalid args`);
			cb(_value());
		}

console.log(`_scrape: Started...`);

		Promise.all(urls.map(url => {
			return new Promise(function(resolve,reject) {
				var _startTime = new Date().getTime();
				var _inTime, _endTime, re, filter, dbItem, hostname;
				var value = null, returnVal = [], errors = [];
				var startString, endString, startPos,endPos,findAll,capture;
				var retries = HTTP_GET_RETRIES;

				_request(url,bounds,retries,resolve,_startTime,_requestCallBack);		
			})
		})).then((result) => {
			result.forEach((item)=>{
				if (item) {
					console.log(`${item}`);
				}
			})
			_scrapeEnd = new Date().getTime();
			//console.log(`_scrape: Found ${_result.length} non-unique item(s)`);
			console.log(`_scrape: Found ${_mapResult.size} unique item(s)`);
			console.log(`_scrape: Total Processing ${_scrapeEnd - _scrapeStart} ms`);
			cb(_value());
		}).catch((err) => {
			console.log(`_scrape: error ${err}`);
			cb(_value());
		})
	};

	_getUrlRegion = function(url) {
		var region = 'us';
		if (url.indexOf('/us/') !== -1) region = 'us';
		if (url.indexOf('/eu/') !== -1) region = 'eu';
		if (url.indexOf('/kr/') !== -1) region = 'kr';	
		if (url.indexOf('/global/') !== -1) region = 'us';
		if (url.indexOf('=us') !== -1) region = 'us';
		if (url.indexOf('=eu') !== -1) region = 'eu';
		if (url.indexOf('=kr') !== -1) region = 'kr';
		return region;
	}

	_getUrlPlatform = function(url) {
		var platform = 'pc';
		if (url.indexOf('/pc/') !== -1) platform = 'pc';
		if (url.indexOf('/xbl/') !== -1) platform = 'xbl';
		if (url.indexOf('/xbox/') !== -1) platform = 'xbl';
		if (url.indexOf('/psn/') !== -1) platform = 'psn';
		if (url.indexOf('platform=pc') !== -1) platform = 'pc';
		if (url.indexOf('platform=xbox') !== -1) platform = 'xbl';
		if (url.indexOf('platform=xbl') !== -1) platform = 'xbl';
		if (url.indexOf('platform=psn') !== -1) platform = 'psn';
		return platform;
	}

	_requestCallBack = function(result,url,bounds,retries,resolve, start) {
		if (result == -1) {
			retries -= 1;
			if (retries > 0) {
				_request(url,bounds,retries,resolve,start,_requestCallBack);
			} else {
				_endTime = new Date().getTime();
				resolve('Processed (fail) ' + url + ' in ' + (_endTime - start) + ' ms');	
			}
		} else {
			_endTime = new Date().getTime();
			resolve('Processed (success)' + url + ' in ' + (_endTime - start) + ' ms');
		}
	}	

	_request = function(url,bounds,retries,resolve,start,cb) {
		var returnVal, platform, region;
		console.log(`Try #${HTTP_GET_RETRIES - retries + 1} of ${HTTP_GET_RETRIES}, GET: ${url}`);

		var agentOptions = {
        	socksHost: 'localhost', // Defaults to 'localhost'.
        	socksPort: 9150 // Defaults to 1080.
    	}

// request({url: url
// 			,strictSSL: true
// 			,agentClass: agent
// 			,timeout:HTTP_GET_TIMEOUT
// 			,agentOptions} ,function (error, response, body) {

		request({url: url
			,timeout:HTTP_GET_TIMEOUT
			// ,strictSSL: true
			// ,agentClass: agent
			// ,agentOptions
			} ,function (error, response, body) {

			if (!error && response.statusCode === 200) {
			console.log(`Response received: ${url}...`);
			  	// _inTime = new Date().getTime();
			  	returnVal = -1;
			    try {
					bounds.forEach((bound,position) => {

						var matchHost = new RegExp(bound.hostname,'i');
						hostname = urlLib.parse(url).hostname;
						if (matchHost.exec(hostname)) {
							capture = body;

						  	findAll = bound.bstrings.every((bstring,position) => {
								startString = bstring.startString;
								endString = bstring.endString;
								endPos = -1;
							  	startPos = capture.indexOf(startString,0);
							  	if (startPos !== -1) {
								  	endPos = capture.indexOf(endString,startPos + startString.length);
								  	if (endPos !== -1) {
								  		capture = capture.substr(startPos,endPos - startPos + endString.length);
									}
							  	}
							  	return (endPos !== -1);
						  	});

							if (findAll) {
								//console.log(`Capture region found: ${capture}`);

								re = new RegExp(bound.regex,'gi');
								filter = new RegExp(bound.filter,'i');

								while ((value = re.exec(capture)) !== null) {

									if (!filter.exec(value[1])) {
										returnVal = 0;					//found at least 1 player id in bound
// console.log(`+${value[1]}`);
										//_result.push(value[1]);
										if (!_mapResult.get(value[1])) {

											platform = _getUrlPlatform(url);
											region = _getUrlRegion(url);
											dbItem = {key : value[1], platform: platform, region : region, hostname : hostname, timestamp: new Date().getTime()};
											_mapResult.set(value[1],dbItem);
										} 
									}
								}
							}
						}
					})
			    }
			    catch (err) {
			    	console.log(`Error in bounds checking: ${err}\n`);
			    	//reject(err);
			    }
			} else {
				returnVal = -1;
				console.log(`Error was ${error}`);
				if (error && error.code && error.connect) {
					if (error.code === 'ETIMEDOUT') {
						if (error.connect === true) {
							console.log(`Timeout connecting to ${url}`);
						} else {
							console.log(`Timeout reading from ${url}`);
						}	
					}
				} else if (response) {
					console.log(`Error retrieving ${url}, response status was ${response.statusCode}`);
				} else {
					console.log(`Error retrieving ${url}, error was ${error}`);
				}
			}
			cb(returnVal,url,bounds,retries,resolve, start);					
		})
	}

	_shihoko = function(url,timeout,uniqueKey,bounds,cb) {
		let _startTime = new Date().getTime();
		let _inTime;
		let results = {}, value = null, reMap = {}, returnVal = [], dbCollection = [];
		let startString, endString, startPos,endPos,findAll,capture;
		
		request({url: url
			,timeout:timeout},
		function (error, response, body) {
		  	//console.log(`GETting ${url}...`);
			if (!error && response.statusCode === 200) {

			  	_inTime = new Date().getTime();
			  	console.log(`Retrieval time for ${url} was ${_inTime - _startTime} ms`);
			  	bounds.forEach((bound,position) => {
					capture = body;
				  	findAll = bound.bstrings.every((bstring,position) => {
						startString = bstring.startString;
						endString = bstring.endString;
						endPos = -1;
					  	startPos = capture.indexOf(startString,0);
					  	if (startPos !== -1) {
						  	endPos = capture.indexOf(endString,startPos + startString.length);
						  	if (endPos !== -1) {
						  		capture = capture.substr(startPos,endPos - startPos + endString.length);
							}
					  	}
					  	return (endPos !== -1);
				  	});

					if (findAll) {
						console.log('Found ',bound.category,bound.subcategory);
						returnVal.push(getPlayer());
					}

					function getPlayer() {
							let player = {};
							player.playerId = uniqueKey.key;
							player.region = uniqueKey.region;
							player.platform = uniqueKey.platform;
							player.category = bound.category;
							player.subcategory = bound.subcategory;
							player.group = bound.group;
							player.order = bound.order;
							player.stats = [];
							player.timeStamp = _inTime;

							if (bound.boundtype === 'single') {
								let data = {};
								let dbItem = {};
								data.hero = 'All';
								data.type = 'Default';
								data.keys = [];

								dbItem.playerId = uniqueKey.key;
								dbItem.region = uniqueKey.region;
								dbItem.platform = uniqueKey.platform;
								dbItem.category = bound.category;
								dbItem.subcategory = bound.subcategory;
								dbItem.hero = 'All';
								dbItem.stats = {};

								let re = new RegExp(bound.regex,'i');
								let value = re.exec(capture);

								if (value && value[1]) {
									data.keys.push({key : bound.subcategory, value : value[1]});
									let cvDecimal = value[1].replace(/,/g, '');
									if (!isNaN(parseFloat(cvDecimal)) && isFinite(cvDecimal)) {
										dbItem.stats[bound.subcategory] = parseFloat(cvDecimal);
									} else {
										dbItem.stats[bound.subcategory] = value[1];	
									}								
								}

								if (data.keys.length > 0) {
									player.stats.push({hero : data.hero, type : data.type, keys : data.keys});
								}

								dbCollection.push({key : dbItem.playerId, region : dbItem.region, platform : dbItem.platform, category : dbItem.category,
									subcategory : dbItem.subcategory, hero : dbItem.hero, stats : dbItem.stats, timestamp: new Date().getTime()});
							}

							if (bound.boundtype === 'multiple') {
									Promise.all(cats.map(item => {
										return new Promise(function(resolve,reject) {
											let data = {};
											let dbItem = {};
											let startPos = capture.indexOf(item.startString,0);
											let endPos = capture.indexOf(item.endString,startPos + item.startString.length);
											let subcat;
											if (endPos === -1) {
												endPos = capture.indexOf(item.endAltString,startPos + item.startString.length);
												subCat = capture.substr(startPos,endPos - startPos + item.endAltString.length);
											} else {
												subCat = capture.substr(startPos,endPos - startPos + item.endString.length);
											}

											try {
												if (startPos !== -1 && subCat && regs[item.category]) {	//hero exists
													data.hero = item.category;    
													data.type = 'Default';
													data.keys = [];	 
													results[item.category] = [];


													dbItem.playerId = uniqueKey.key;
													dbItem.region = uniqueKey.region;
													dbItem.platform = uniqueKey.platform;
													dbItem.category = bound.category;
										 			dbItem.subcategory = bound.subcategory;
													dbItem.hero = item.category;
													dbItem.stats = {};

													let arr = regs[item.category].split('|');

													arr.forEach((key,position)=> {
														if (key.startsWith('@')) {
															if (data.keys.length > 0) {
																player.stats.push({hero : data.hero, type : data.type, keys : data.keys});
																data.keys = [];
															}
															data.type = key.substr(1,key.length - 1);
														} else {
															let re = null;
															if (reMap.hasOwnProperty(key)) {
																re = reMap[key];	
															} else {
																re = new RegExp(bound.regex.replace('xxx',key),'i');
																reMap[key] = re;
															}
															value = re.exec(subCat);
															if (value && value[1]) {
																data.keys.push({key : key, value : value[1]});
																results[item.category].push({key : key, value : value[1]});
																
																let cvDecimal = value[1].replace(/,/g, '');
																if (!isNaN(parseFloat(cvDecimal)) && isFinite(cvDecimal)) {
																	dbItem.stats[key] = parseFloat(cvDecimal);
																} else {
																	dbItem.stats[key] = value[1];	
																}
															}	
														}
													});
													if (data.keys.length > 0) {
														player.stats.push({hero : data.hero, type : data.type, keys : data.keys});
													}

													dbCollection.push({key : dbItem.playerId, region: dbItem.region, platform : dbItem.platform, category : dbItem.category,
														subcategory : dbItem.subcategory, hero : dbItem.hero, stats : dbItem.stats, timestamp: new Date().getTime()});

												}  else {
													//nothing to evaluate
												}
												resolve();
											}
											catch (err) {
												reject(err);
											} 
											
										});
									})).then(()=> {	
										// cb(_inTime,_startTime);
									}).catch((error)=> {
										console.log(`Error parsing RegExp: ${error}\n`);	
									});
							}			
							return player;	
						}
						//end getPlayer
			  	})  //bounds
				
				let result = {_inTime : _inTime, _startTime : _startTime, returnVal : returnVal, dbCollection : dbCollection};
				cb(null,result);

			} else {
				console.log(`Error retrieving ${url}: returned ${error || response.statusCode}`);
				let result = {_inTime : _inTime, _startTime : _startTime, returnVal : returnVal, dbCollection : dbCollection};
				cb(error || response.statusCode,result);
			}
		})
	}

	return {config : _config
		, scrape : _scrape
		, shihoko : _shihoko};

})();

module.exports = scrapeObj;


