let test = require('./updatePlayers');
//Kevin-14568
let playerIds = 'TheLoneWolf#1318';	//note the #
setTimeout(()=>{
	let startTime = Date.now();
	test.getPlayers([playerIds])
		.then((result)=>{
			console.log('Record count returned',result.length);
			console.log('Records returned: ',JSON.stringify(result));
			let endTime = Date.now();
			console.log(`Overall Time elapsed: ${endTime - startTime} ms`);
		})
		.catch((err)=>{
			console.error(err);
		})
},2000)



