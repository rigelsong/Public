process.stdin.resume();
process.stdin.setEncoding('ascii');

var input_stdin = "";
var input_stdin_array = "";
var input_currentline = 0;

process.stdin.on('data', function (data) {
    input_stdin += data;
});

process.stdin.on('end', function () {
    input_stdin_array = input_stdin.split("\n");
    main();    
});

function readLine() {
    return input_stdin_array[input_currentline++];
}

/////////////// ignore above this line ////////////////////

function prims(n, edges, start) {
    
    let vertices = [];
    let totalCost = 0;
    let edgeObj = {};
    vertices.push(start);
    
    for (let i=0; i < edges.length; i++) {
        if (edgeObj.hasOwnProperty(edges[i][0])) {
            edgeObj[edges[i][0]].push(edges[i]);
        } else edgeObj[edges[i][0]] = [edges[i]];

        if (edgeObj.hasOwnProperty(edges[i][1])) {
            edgeObj[edges[i][1]].push(edges[i]);
        } else edgeObj[edges[i][1]] = [edges[i]];
    }
    
    while (vertices.length < n) {
        
        let candidates = [];
        for (let v of vertices) {
            candidates = candidates.concat(edgeObj[v]);
        }
        
        //grab an edge that gets a new vertex
        let minEdge = candidates.filter(edge => {
            return ( ((vertices.indexOf(edge[0]) !== -1 && vertices.indexOf(edge[1]) === -1)
                   || (vertices.indexOf(edge[1]) !== -1 && vertices.indexOf(edge[0]) === -1))
                   );
        }).reduce((minEdge,edge)=> {
            return edge[2] < minEdge[2] ? edge : minEdge;
        },[0,0,1000000])
        
        //accumulate result
        totalCost += minEdge[2];
        if (vertices.indexOf(minEdge[0]) !== -1) {
            vertices.push(minEdge[1])
        } else vertices.push(minEdge[0]);
        //remove from edgeObj
    }
    return totalCost;
}

function main() {
    var n_temp = readLine().split(' ');
    var n = parseInt(n_temp[0]);
    var m = parseInt(n_temp[1]);
    var edges = [];
    for(edges_i = 0; edges_i < m; edges_i++){
       edges[edges_i] = readLine().split(' ');
       edges[edges_i] = edges[edges_i].map(Number);
    }
    var start = parseInt(readLine());
    var result = prims(n, edges, start);
    process.stdout.write("" + result + "\n");

}
