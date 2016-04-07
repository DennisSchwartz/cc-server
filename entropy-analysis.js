/**
 * Created by ds on 06/04/2016.
 */

var fs = require('fs');
var R = require('ramda');
var munemo = require('biojs-io-munemo');


var network;
//var file = fs.readFileSync('/Users/ds/Documents/Code/Thesis/BioJS/Data/slk2/Human-AllPW-ExOnly-NoTF.csv', 'utf-8');
//network = munemo( { inFormat: 'csv', data: file, opts: { paths: true } });
//console.log(network.nodes[0]);

var path = process.argv[2];
if (!path)  path = '2016-04-06T15:10:56.804Z-Drosophila-AllPW-ExOnly-NoTF.json';

file = fs.readFileSync('/Users/ds/Documents/Code/Thesis/BioJS/cross-talk-server/' + path, 'utf-8');
network = JSON.parse(file);


// Analyse for Multiplex Entropy
var nodes = network.nodes;

var pNodes = R.filter(function (n) { return n.data.paths[0].length > 0; }, nodes);
var multiPWNodes = R.filter(function (n) { return n.data.paths.length > 1; }, pNodes);
console.log("Nodes with PWs attached: ", pNodes.length);
console.log("Nodes with multiple PWs: ", multiPWNodes.length);

var subset = R.filter(function (n) { return n.data.H_i > 0; }, multiPWNodes);
console.log(subset.length + " / " + nodes.length);
var max = {
    data: {
        H_i: 0
    }
};
subset.forEach(function (n) {
    max = n.data.H_i > max.data.H_i ? n : max;
});

console.log("Highest Entropy: ", max);

// Analyse for Participation coefficient

var subset2 = R.filter(function (n) { return n.data.P_i > 0.66; }, network.nodes);
console.log("Participation: ", subset2.length + " / " + nodes.length);
max = {
    data: {
        P_i: 0
    }
};
subset2.forEach(function (n) {
    max = n.data.P_i > max.data.P_i ? n : max;
});

console.log("Highest Participation: ", max);