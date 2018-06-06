
//async comboFn (opts,k,fn)
//execute some async fn, selecting k times from possible array of opts

async function comboFn (opts,k,fn) {

	let count = 1;
	let n = k;
	let a = Array(n).fill(opts[0]);
	let p = Array(n).fill(0);

	function isComplete(a) {
		for (let i=0; i < a.length; i++) {
			if (a[i] !== opts[opts.length-1]) return false;
		}
		return true;
	}

	let tick = 0;
	let result = null;

	while (!isComplete(a)) {
			count ++;
			result = await fn(a);
			tick++;
			
			if (tick === opts.length) {
				tick = 0;
				//bump counter
				for (let index=a.length-2; index >= 0; index--) {
					p[index]++;
					if (p[index] === opts.length) {
						p[index] = 0;
						a[index]=opts[p[index]];
					} else {
						a[index]=opts[p[index]];
						break;
					}
				}
			}
			a[a.length-1] = opts[tick];

	}
		result = await fn(a);
	return count;
}

function logger(s) {
	return new Promise((resolve,reject) => {
		console.log(s);
		resolve(true);
	})
}

function main() {
	let start = Date.now();
	let a = [];
	for (let j=0; j < 52; j++) a.push(j);
	comboFn(a, 4, logger)
	.then ((result)=>{
		console.log(`${result} combinations shown in ${Date.now() - start}ms`);
	})
}

main();



