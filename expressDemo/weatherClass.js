//As of 2018-09-10 the wunderground API @ https://www.wunderground.com/weather/api
//is no longer free, but we use a mock class for development
//a production app should also have a fallback api in case of primary api failure (not implemented below)

const request = require('request-promise-native');
const MOCK_DATA = {city : 'Philadelphia, PA', temperature : 61, measurement: 'Farenheit', dateStamp: Date.now()};
const PUBLIC_TEST_URL = 'http://ip-api.com/json/54.148.84.95';


var api = (function() {  //start iif

//base
class baseWeatherApi {
	constructor () {
	}

	//shared functions
	FtoC(farenheit) {
		//if (!isNaN(parseFloat(farenheit)))
		//TODO: stub
	}

	CtoF(celsius) {
		//if (!isNaN(parseFloat(celsius)))
		//TODO: stub
	}
}


class publicWeatherApi extends baseWeatherApi {
	constructor () {
		super();
	}

	_getPublicData(cityOrZip) {
		return new Promise((resolve,reject)=>{
			request(PUBLIC_TEST_URL)
			.then(body=> {
			    resolve(JSON.parse(body));
			})
			.catch(err=> {
				reject(err);	
			})
		})
	}

	async getWeather(cityOrZip) {
		let result = await this._getPublicData(cityOrZip);
		return result;
	}
}


class mockWeatherApi extends baseWeatherApi {
	constructor () {
		super();
	}

	async getWeather(cityOrZip) {
		if (cityOrZip === '19120' || cityOrZip === 'Philadelphia, PA') return MOCK_DATA;
	}
}


class weatherApiFactory {
	constructor(type) {
		if (type === 'dev') return new mockWeatherApi();
		return new publicWeatherApi();
	}
}

//return public members
return {
	weatherApiFactory : weatherApiFactory
};

})();  //end iif

module.exports = api;
