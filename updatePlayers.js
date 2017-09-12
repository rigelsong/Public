//TODO
//issues: not all data pulling e.g. Games Played for Kevin-14568

//library: updatePlayers.js
//description: player stat get and update methods

const request = require('request');
const async = require('async');
let dbConfig = require('./dbConfig');
let db = require('./inventoryDb');

const DETAIL_BASE_PC_URL = 'https://playoverwatch.com/en-us/career/%PLATFORM%/%REGION%/%PLAYERID%';
const DETAIL_BASE_CONSOLE_URL = 'https://playoverwatch.com/en-us/career/%PLATFORM%/%PLAYERID%';

const PLAYER_DS = 'players';
const STAT_DS = 'stats';
const DEFAULT_REGFILE = './config_regs';
const DB_OPTION_REPLACE_ONE = false;
const DB_OPTION_REPLACE_ALL = true;
const DB_REFRESH_INTERVAL = 1000*60*5;
const HTTP_DEFAULT_TIMEOUT = 10000;
const HTTP_USER_AGENT_MOBILE = 'Mozilla/5.0 (Android 4.4; Mobile; rv:41.0) Gecko/41.0 Firefox/41.0';
const HTTP_MAX_CONNECTIONS = 40;

const INITIAL_WAIT = 10000;
const HEADER_BATCH_SIZE = 100;
const BATCH_POST_WAIT_TIME = 1000;
const DETAIL_URL_TIMEOUT = 10000;

const _config = {};
const _regions = ['us','eu','kr'];
const _consoles = ['xbl','psn'];

const regs = require('./config_regs');
const cats = require('./config_cats');
const bounds = require('./config_bounds');
const scrape = require('./scrape');
const scrapeConfig = {cats : cats, regs : regs, bounds : bounds};

main();

function main() {
	scrape.config(scrapeConfig);
	db.config(dbConfig);
	db.recycleDb();
	var interval = setInterval(db.recycleDb,DB_REFRESH_INTERVAL);
}

function matchPlayers(id, {hero,region,platform}={}) {

	//match selected playerId to players in db
	//hero is desired hero
	return [...id,'Kevin-14568','Dementio-1347'];
}

// function getMatchedPlayers(id) {
// 	getPlayers(matchPlayers(id))
// 		.then((result)=>{
// 			return result;
// 		})

// }


function getPlayers(ids) {
	
	return new Promise((resolve,reject)=>{
		if (!(ids && Array.isArray(ids))) {
			return reject('Err: no ids supplied');
		}

	 	let newIds = ids.map((id)=>{
	 		console.log(id);
	 		return id.replace('#','-');
	 	});

		updatePlayers(newIds,{forceUpdate:true})
			.then(()=>{
				//get up to date player stats
				return db.get(STAT_DS,{key : {$in : newIds},region : 'us',category : {$in : ['Overall','Competitive']} });
			})
			.then((result)=>{
				let returnVal = [];
				let out = [];
				if (!(result.data && Array.isArray(result.data))) {
					return resolve(out);
				}
				returnVal = result.data.filter((item)=>{
						return (item.category == 'Overall' && item.subcategory == 'Rank');
					})
					.map((item)=>{
						return {
							key : item.key,
							region : item.region,
							platform : item.platform,
							rank : item.stats.Rank
						}	
					})
				for (let datum of returnVal) {
					let stats = result.data.filter((item)=>{
										return (item.key == datum.key && item.region == datum.region && item.platform == datum.platform
											&& item.category == 'Competitive' && item.subcategory == 'Career');
									})
									.reduce((data,item)=>{
										let statItem = {name : item.hero
											,stats : 
											{'Time Spent on Fire' : item.stats['Time Spent on Fire'],
											'Time Played' : item.stats['Time Played'],
											'Games Played' : item.stats['Games Played'],
											'Games Won' : item.stats['Games Won'],
											'Objective Time' : item.stats['Objective Time'],
											}
										};
										if (!data.heroes) data.heroes = [];
										data.heroes.push(statItem);
										return data;
									},datum);
					out.push(stats);
				}
				resolve(out);
			})
			.catch((err)=>{
				reject(err);
			})
	});
}


function updatePlayers(ids,{forceUpdate=false}={}) {
	return new Promise((resolve,reject)=>{
		if (!(ids && Array.isArray(ids))) {
			return reject('Err: no ids supplied');
		}

		//Loop ids
		async.forEachLimit(ids,HTTP_MAX_CONNECTIONS,(battleId,taskCallBack)=>{
			//
			let startTime,endTime;

			// see if we have player updated within last hour
			let dateCompare = Date.now() - 1000 * 60 * 60;
			db.get(PLAYER_DS,{key : battleId,gotStats: true, timestamp : {$gt : dateCompare}})

			.then((result)=>{

				//if player stale
				if (forceUpdate || !(result && Array.isArray(result.data) && result.data.length >= 1)) {
					getPlatform(battleId,(err,result)=> {
						if (err) {
							return taskCallBack(err)
						}
						if (!err) {
							console.log(`Result for ${battleId} was ${JSON.stringify(result)}`);

							//Loop region and platforms for id
							async.forEachLimit(result,HTTP_MAX_CONNECTIONS,(item,innerTaskCallBack)=>{
								let dbItem = {key : item.key, platform: item.platform, region : item.region, hostname : 'self', timestamp: new Date().getTime()};
								db.put(PLAYER_DS,{key : dbItem.key, platform : dbItem.platform, region : dbItem.region},dbItem,false, DB_OPTION_REPLACE_ALL)
									.then((result)=>{

										startTime = Date.now();
										return detailScrape(PLAYER_DS,{key : dbItem.key, platform : dbItem.platform, region : dbItem.region});
									})
									.then((result)=>{
										//
										endTime = Date.now();
										console.log(`Time elapsed: ${endTime - startTime} ms`);

										innerTaskCallBack();
									})
									.catch((err)=>{
										innerTaskCallBack(err);
									});
							},
							(innerErr)=>{
								if (innerErr) return taskCallBack(innerErr);
								taskCallBack();
							})
						};
					});
				} else {
					console.log(`${battleId} data is already up to date or battle ids are fubar`);
					taskCallBack();
				}
			})
			.catch((err)=> {
				taskCallBack(err);
			})
		},
		(err)=>{
			if (err) return reject(`Err: updatePlayers: ${err}`);
			resolve(true);
		})
	});
}

//it|returns platform and region for given battleId
//expect|getPlatform('Tinisty#1229',null)|{key : 'Tinisty-1229',platform : 'pc', region : 'us'}
function getPlatform(id,cb) {

	let _inTime = Date.now();
	let platform = '';
	let tries = [];
	let results = [];

	if (!id) {
		return cb('No id supplied',null);
	}

	if (id.indexOf('#') !== -1 || id.indexOf('-') !== -1) {
		platform = 'pc'
		id = id.replace('#','-');
	}

	//populate tries with all possible configs
	// 
	if (platform === 'pc') {
		for (let region of _regions) {
			let url = DETAIL_BASE_PC_URL.replace('%PLATFORM%','pc').replace('%REGION%',region).replace('%PLAYERID%',id)
			tries.push({platform, region, url});
		}
	}

	if (platform !== 'pc') {
		for (let _console of _consoles) {
			let url = DETAIL_BASE_CONSOLE_URL.replace('%PLATFORM%',_console).replace('%PLAYERID%',id)
			tries.push({platform : _console, region : 'us', url});
		}
	}

	//process tries
	async.forEachLimit(tries,HTTP_MAX_CONNECTIONS,function(taskItem,taskCallBack) {
		checkUrl(taskItem.url,{timeout : HTTP_DEFAULT_TIMEOUT, verbose : true}, (err,res)=>{
			if (!err && res) {
				results.push({key : id, platform : taskItem.platform, region: taskItem.region});
			}
			taskCallBack();	
		}) 
	},(err) =>{
		if (err) {
			return cb(err,null);
		}
		console.log(`getPlatform time was: ${Date.now() - _inTime} ms`);

		cb(null,results);
	});

	function checkUrl(url,{timeout = HTTP_DEFAULT_TIMEOUT, verbose = false}={},cb) {

		//request
		request({url,timeout, 

			headers: {
    			'User-Agent' : HTTP_USER_AGENT_MOBILE
	  			}
			},(error, response, body) => {
				if (!error && response.statusCode === 200) {
					if (verbose) {  console.warn(`Response received: ${url}`);
						// console.log(`\nBody was: ${body}`);
						}
					if (!cb) { return true};
					if (cb) { return cb(null,true)};
				} 
				if (verbose) {
					if (error && error.code && error.connect) {
						if (error.code === 'ETIMEDOUT') {
							if (error.connect === true) {
								console.error(`Timeout connecting to ${url}`);
							} else {
								console.error(`Timeout reading from ${url}`);
							}	
						}
					} else if (response) {
						console.error(`Error retrieving ${url}, response status was ${response.statusCode}`);
					} else {
						console.error(`Error retrieving ${url}, error was ${error}`);
					}					
				}

				if (!cb) { return false};
				if (cb) { return cb('checkUrl: unable to get HTTP 200 OK',null)};
			})
	}
}


function detailScrape(collection,query) {

	return new Promise((resolve,reject)=>{

		let page = 1, pageRows = 0, sizeOnly = true;
		let headerSize
		let seriesTasks = [];
		let seriesArgs = [];
		let summary = '';
		let count = 0;
		let scrapeStart = new Date().getTime();
		let scrapeEnd;

		if (query === undefined) {query = {}};
		if (!collection) return reject(`Err: no collection supplied`);

		db.find(collection,query,page,pageRows,sizeOnly)
			.then((result)=>{
				if (result.data && result.data > 0) {
					headerSize = result.data;

					for (page = 0; page < Math.floor(headerSize / HEADER_BATCH_SIZE) + ((headerSize % HEADER_BATCH_SIZE) > 0 ? 1 : 0); page++) {
						seriesTasks.push(getDetail);
						seriesArgs.push(page + 1);		

						//TODO: test first batch
						// if (page >= 2) break;		//test with first batch of HEADER_BATCH_SIZE only		
					}
						
					function getDetail(seriesCallBack) {
						let batch = seriesArgs.shift();
						let baseUrl, batchSummary = '', batchCount = 0;
						if (batch !== undefined) {
							db.find(collection,query,batch,HEADER_BATCH_SIZE,false).then(function(result){
								if (result.data && Array.isArray(result.data) && result.data.length > 0) {

									async.forEachLimit(result.data,HTTP_MAX_CONNECTIONS,function(item,taskCallBack) {
										let url, writeCount=0,errCount=0;

										baseUrl = (item.platform && item.platform === 'pc') ? DETAIL_BASE_PC_URL : DETAIL_BASE_CONSOLE_URL;
										url = baseUrl.replace('%PLAYERID%',item.key);	//case sensitive key
										url = url.replace('%PLATFORM%',item.platform ? item.platform.toLowerCase() : 'pc');
										url = url.replace('%REGION%',item.region ? item.region.toLowerCase() : 'us');

										if (url) {
											let uniqueKey = {key : item.key, platform: item.platform, region: item.region};

											scrape.shihoko(url,DETAIL_URL_TIMEOUT, uniqueKey, bounds, function(err,dbResult) {
												if (!err) {
														//replace all stat rows for selected key
													db.put(STAT_DS,uniqueKey,dbResult.dbCollection, true, DB_OPTION_REPLACE_ALL).then((result)=>{writeCount++}).catch((err)=>{errCount++});
														//update players
													item.gotStats = true;									
													db.put(PLAYER_DS,uniqueKey,item,false).then((result)=>{writeCount++}).catch((err)=>{errCount++});
													batchSummary += 'Batch (success): ' + url + '\n';
													summary += 'Processed (success): ' + url + '\n';
												} else {  
													batchSummary += 'Batch (fail): ' + url + '\n';
													summary += 'Processed (fail): ' + url + '\n';
												}
												batchCount++;
												count++;
												taskCallBack();
											});
										} else {
											taskCallBack();
										}
									},function final(err) {
										if (err) {
											console.log(`Batch detail scrape error: ${err}`);
										} else {
											console.log(`--------------`);
											console.log(`Batch summary:`);
											console.log(batchSummary);
											console.log(`Batch items processed: ${batchCount}`);
											console.log(`Total items processed so far: ${count}`);
										}
										setTimeout(seriesCallBack,BATCH_POST_WAIT_TIME);	
									});
								} else {
									seriesCallBack();	
								}
							}).catch(function(err) {
								console.log(err);
								seriesCallBack();
							})	
						} else {
							seriesCallBack();
						}
					}
									
					async.series(seriesTasks,(err)=> {
						if (err) console.log(`Unable to complete all detail scrapes: ${err}`);
						if (!err) {
							console.log(`------------------`);
							console.log(`Execution summary:`);
							console.log(summary);
							console.log(`Total items processed: ${count}`);
						};
						scrapeEnd = new Date().getTime();
						console.log(`Total Processing time: ${scrapeEnd - scrapeStart} ms`);
						return resolve(true);
					});
				}		
			})
			.catch(function(err) {
				console.log(err);
				reject(err);
			});
	})

}


exports.updatePlayers = updatePlayers;
exports.getPlayers = getPlayers;
exports.matchPlayers = matchPlayers;

