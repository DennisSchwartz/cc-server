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
if (!path)  path = 'Human-All-TF1-2016-04-13T09:49:10.169Z.json';

file = fs.readFileSync('/Users/ds/Documents/Code/Thesis/BioJS/cross-talk-server/results/' + path, 'utf-8');
network = JSON.parse(file);

//console.log(JSON.stringify(network.nodes));

// Analyse for Multiplex Entropy
var nodes = network.nodes;

//console.log(R.filter(function (n) { return n.data.paths.indexOf("TGF(core)") >= 0;}, nodes));
//
//var pNodes = R.filter(function (n) { return n.data.paths[0].length > 0; }, nodes);
//var multiPWNodes = R.filter(function (n) { return n.data.paths.length > 1; }, pNodes);
//console.log("Nodes with PWs attached: ", pNodes.length);
//console.log("Nodes with multiple PWs: ", multiPWNodes.length);
//
//var mostPWs = {
//    data: {
//        paths: []
//    }
//};
//
//var equals = [];
//
//multiPWNodes.forEach(function (n) {
//    if (n.data.paths.length > mostPWs.data.paths.length) {
//        mostPWs = n;
//        equals = [];
//        equals.push(n);
//    } else if (n.data.paths.length === mostPWs.data.paths.length) {
//        equals.push(n);
//    }
//});

//console.log(equals);

var subset = R.filter(function (n) { return n.data.H_i > 0; }, network.nodes);
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
console.log("Participation: ", subset2.length + " / " + network.layers.length);
max = {
    data: {
        P_i: 0
    }
};
subset2.forEach(function (n) {
    max = n.data.P_i > max.data.P_i ? n : max;
});

console.log("Highest Participation: ", max);

// Get all interactions for max

var ss3 = R.filter(function (e) {

    // get nodes
    var src = network.elements[e.data.source];
    var trg = network.elements[e.data.target];
    return src.data.node === max.data.id.substr(1) || trg.data.node === max.data.id.substr(1);

}, network.edges);

//console.log(ss3);


var degPercentage = {};

for ( var i = 0 ; i < network.metrics.avgLayerDegree.length; i++ ) {
    degPercentage[network.layers[i].data.id] = ( network.metrics.avgLayerDegree[i] / network.metrics.avgDegree ) * 100;
}

console.log('AvgDegree: ', network.metrics.avgDegree);
console.log('AvgLayerDegree: ', network.metrics.avgLayerDegree);
console.log('DegPercentage: ', degPercentage);

var maxDeg = {
    data: {
        degree: 0
    }
};
network.nodelayers.forEach(function (nl) {
    maxDeg = nl.data.degree > maxDeg.data.degree ? nl : maxDeg;
});

console.log(maxDeg);

//network.func.calcNodelayerDegrees();

// Extract mutual regulators for pathways

var pathways = ['Hedgehog', 'WNT/Wingless'];
var layer = 'Transcriptionalregulation';

var sub = getRegulators(network, pathways, layer);

//console.log(sub);

//// Get edges with both in trgPath
//
//var transcriptSubset = R.filter(function (e) {
//    return e.data.source.indexOf('Transcriptionalregulation') > 0;
//}, network.edges);
//
//var mutual = R.filter(function (e) {
//    return e.data.trgPath.indexOf(pathways[0]) > -1 && e.data.trgPath.indexOf(pathways[1]) > -1;
//}, transcriptSubset);
//
//console.log("Mutual: ", mutual.length);
//
//var p1 = R.filter(function (e) {
//    return e.data.trgPath === pathways[0] + '(core)' || e.data.trgPath === pathways[0] + '(non-core)';
//}, transcriptSubset);
//
//var p1Nodes = [];
//
//p1.forEach(function (e) {
//    p1Nodes.push(network.elements[e.data.source]);
//});
//
//var unique = R.uniqBy(R.path(['data', 'id']));
//
//p1Nodes = R.difference(unique(p1Nodes), mutual);
//
//
//var p2 = R.filter(function (e) {
//    return e.data.trgPath === pathways[1] + '(core)' || e.data.trgPath === pathways[1] + '(non-core)';
//}, transcriptSubset);
//
//var p2Nodes = [];
//
//p2.forEach(function (e) {
//    p2Nodes.push(network.elements[e.data.source]);
//});
//
//p2Nodes = R.difference(unique(p2Nodes), mutual);
//
//console.log("Exclusive to " + pathways[0] + ": ", p1Nodes);
////console.log(p1Nodes.length);
//
//console.log("Exclusive to " + pathways[0] + ": ", p1Nodes.length);
//console.log("Exclusive to " + pathways[1] + ": ", p2Nodes.length);
//console.log("Mutual regulators: " + mutual.length);


function getRegulators (network, pathways, layer) {

    var unique = R.uniqBy(R.path(['data', 'id']));

    var transcriptSubset = R.filter(function (e) {
        return e.data.source.indexOf(layer) > 0;
    }, network.edges);

    var mutual = R.filter(function (e) {
        return e.data.trgPath.indexOf(pathways[0]) > -1 && e.data.trgPath.indexOf(pathways[1]) > -1;
    }, transcriptSubset);

    var p1 = R.filter(function (e) {
        return e.data.trgPath === pathways[0] + '(core)' || e.data.trgPath === pathways[0] + '(non-core)';
    }, transcriptSubset);

    var p2 = R.filter(function (e) {
        return e.data.trgPath === pathways[1] + '(core)' || e.data.trgPath === pathways[1] + '(non-core)';
    }, transcriptSubset);

    p1 = R.difference(p1, mutual);
    p2 = R.difference(p2, mutual);

    console.log("Exclusive to " + pathways[0] + ": ", p1.length);
    console.log("Exclusive to " + pathways[1] + ": ", p2.length);
    console.log("Mutual regulators: " + mutual.length);

    return { mutual: mutual, p1: p1, p2: p2 };

}