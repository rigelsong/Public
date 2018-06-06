//permutation

let S = ['a','m','i','m','e','n','s','i'];

async function asyncPermute(sPrime) {
	
	return permute(sPrime);

	function permute (sPrime) {
		if (sPrime.length === 2) {
			return [[sPrime[0], sPrime[1]], [sPrime[1], sPrime[0]]];
		}
		let result = [];

		for (let i=0; i < sPrime.length; i++) {
			//pin the ith element of sPrime and permute the rest
			let pin = sPrime[i];
			let subset = [...sPrime.slice(0,i), ...sPrime.slice(i+1,sPrime.length)];
			let perms = permute(subset);
			for (let perm of perms) {
				perm.unshift(pin);
			}
			result = result.concat(perms);
		}
		return result;
	}
}



let start = Date.now();
console.log('Running...');

asyncPermute(S)
	.then((result)=>{
		console.log(result);
		console.log(`Original array size: ${S.length}, permutation size: ${result.length}`);
		console.log(`Completed in: ${Date.now()-start}ms`);
	})
	.catch((err)=>{
		console.log('Error: ',JSON.stringify(err));		
	})

// function factorial(n) {
// 	if (n <= 2) return n;
// 	return n * factorial(n-1);
// }
// console.log(factorial(52));

