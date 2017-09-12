let update = require('./updatePlayers');
let dogFood = ['TheLoneWolf-1318'];

setTimeout(foo,1000);

function foo() {
	update.getPlayers(dogFood)
	.then((result)=>{
		console.log(`Result from getPlayers: ${JSON.stringify(result)}`);
	})
	.catch((err)=>{
		console.log(`Err: ${err}`);	
	})
}



// ['Tinisty-1229','SweetSato-1537','ninjah-1819','TheLoneWolf-1318']

