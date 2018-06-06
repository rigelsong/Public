'use strict';

const fs = require('fs');

process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', inputStdin => {
    inputString += inputStdin;
});

process.stdin.on('end', _ => {
    inputString = inputString.replace(/\s*$/, '')
        .split('\n')
        .map(str => str.replace(/\s*$/, ''));

    main();
});

function readLine() {
    return inputString[currentLine++];
}


function twoPluses(rows) {

    let cols = [];
    let maxArray = [];

    for (let c=0; c < m; c++) {
        for (let r=0; r < n; r++) {
            cols[c] += rows[r].substr(c,1);
        }
    }

    for (let i=0; i < rows.length; i++) {
       for (let j=0; j < rows[i].length; j++) {
            for (let k=1; k < rows[i].length; k += 2) {
                    if (rows[i].substr(j,k) === 'G'.repeat(k))
                        if (k === 1) {
                            sortedArrayInsert(maxArray, k * 2 - 1)
                        } else {
                            if (cols[j+ Math.floor(k/2)].substr(i-Math.floor(k/2), k) === 'G'.repeat(k)) {
                                sortedArrayInsert(maxArray, k * 2 - 1)
                            } 
                        }
            }
        }
    }

    return maxArray[0] * maxArray[1];


    function sortedArrayInsert (array, value) {
        if (array.length == 0 || value < array[array.length-1]) {
            array.push(value);
        } else {
            for (let i=0; i < array.length; i++) {
                if (value > array[i]) {
                    array.splice(i,0,value);
                    break;
                }
            }  
        }
    }

}


function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);
    const nm = readLine().split(' ');
    const n = parseInt(nm[0], 10);
    const m = parseInt(nm[1], 10);
    let grid = [];
    let cols = Array(m).fill('');

    for (let i = 0; i < n; i++) {
        const gridItem = readLine();
        grid.push(gridItem);
    }

    let result = twoPluses(grid);

    ws.write(result + "\n");

    ws.end();

}

   
