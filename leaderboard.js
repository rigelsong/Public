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

// Complete the climbingLeaderboard function below.
function climbingLeaderboard(scores, alice) {

    //build map of leaderboard, rank -> score

    let result = [];
    let leaderBoard = new Map();
    let scoreRank = new Map();
    let rank = 0, currentScore = -1;
    for (let scoresItr=0; scoresItr < scores.length; scoresItr++) {
            if (currentScore !== scores[scoresItr]) {
                rank++;
                currentScore = scores[scoresItr];
                leaderBoard.set(rank, scores[scoresItr]);
            }
    }
    //test
    // return Array.from(leaderBoard);
    
    //iterate through map key,value pairs and build another lookup, by value (score);
    let prevScore = leaderBoard.get(1);
    for (let entry of leaderBoard.entries()) {
        scoreRank.set(entry[1],[entry[0],prevScore]);
        prevScore = entry[1];
    }
    // return Array.from(scoreRank);    
    
    //iterate through alices's scores and lookup dense rank
    
    let scoreRankArray = Array.from(scoreRank);
    
    for (let aliceItr=0; aliceItr < alice.length; aliceItr++) {
        if (scoreRank.has(alice[aliceItr])) {
            result.push(scoreRank.get(alice[aliceItr])[0]);
        } else {
            result.push(binaryFindRank(alice[aliceItr],0,scoreRankArray.length - 1,scoreRankArray));
        }
    }
    
    return result;
    
    function binaryFindRank (value, start, end, mapArray) {
        if (start === end) {
            if (value > mapArray[start][0] && value < mapArray[start][1][1]) {
                return mapArray[start][1][0];
            } else if ( value > mapArray[start][1][1]) return (mapArray[start][1][0])-1 > 0 ? (mapArray[start][1][0]) - 1 : 1;
            else return (mapArray[start][1][0]) + 1;
        }
        else {
            let midPoint = Math.floor((end - start + 1) / 2) + start;
            if (value > mapArray[midPoint][0] && value < mapArray[midPoint][1][1]) {
                return mapArray[midPoint][1][0];
            } else if (value > mapArray[midPoint][1][1]) {
                return binaryFindRank(value, start, midPoint - 1, mapArray);
            } else if ((end - start + 1) == 2) {
                return mapArray[midPoint][1][0] + 1;    
            } else return binaryFindRank(value, midPoint + 1, end, mapArray);
        }
    }
}

function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const scoresCount = parseInt(readLine(), 10);

    const scores = readLine().split(' ').map(scoresTemp => parseInt(scoresTemp, 10));

    const aliceCount = parseInt(readLine(), 10);

    const alice = readLine().split(' ').map(aliceTemp => parseInt(aliceTemp, 10));

    let result = climbingLeaderboard(scores, alice);

    ws.write(result.join("\n") + "\n");
    ws.end();
}
