/**
 * Created by ds on 03/02/16.
 */

var fs = require("fs");
var Baby = require("babyparse");
var R = require("ramda");
var munemo = require('biojs-io-munemo');

function analyze (input) {

    var file;
    if ( typeof input === 'undefined' ) {
        file = fs.readFileSync('/Users/ds/Documents/Code/Thesis/BioJS/Data/slk2/Elegans-Notch-TGF-WNT-No-TF.csv', 'utf-8');
    } else {
        file = fs.readFileSync('/Users/ds/Documents/Code/Thesis/BioJS/Data/slk2/' + input, 'utf-8');
    }

    console.log(input);

    var data = parse(file, true);

    var elements = munemo({inFormat: 'csv', data: file, opts: {paths: true}});
    //console.log(elements);
    var edges = elements.edges;
    var paths = [];

// remove any within pathway interaction
    var filterCore = R.map(function (e) {
        return e.split('(')[0];
    });


    for (var i = 0; i < edges.length; i++) {
        var src = edges[i].data.srcPath.split(',');
        var trg = edges[i].data.trgPath.split(',');
        src = filterCore(src);
        trg = filterCore(trg);
        if ( src != '' ) paths.push(src);
        if ( trg != '' ) paths.push(trg);
        if (arraysEqual(src, trg)) {
            var id = edges[i].data.id;
            delete elements.elements['e' + id];
            edges = R.remove(i, 1, edges);
        }
    }

    var mapSplit = R.curry(R.map(function (e) {
        return e.split('(')[0];
    }));


    var f = R.compose(R.uniq, mapSplit, R.flatten);
    paths = f(paths);

    var object = {};
// Init object
    for (i = 0; i < paths.length; i++) {
        object[paths[i]] = {
            incoming: 0,
            outgoing: 0
        };
    }

// count cross-talks

    var crossTalks = [];
    for (i = 0; i < edges.length; i++) {
        var currentEdge = edges[i];
        var cc = {};
        src = edges[i].data.srcPath.split(',');
        trg = edges[i].data.trgPath.split(',');
        src = filterCore(src);
        trg = filterCore(trg);
        // Test for crosstalk
        for (var sCount = 0; sCount < src.length; sCount++) {
            for (var tCount = 0; tCount < trg.length; tCount++) {
                if (src[sCount] !== trg[tCount] && src[sCount] !== '' && trg[tCount] !== '') {
                    cc["src"] = src[sCount];
                    cc["trg"] = trg[tCount];
                    cc["lvl"] = elements.elements[currentEdge.data.source].data.layer;
                    cc["data"] = currentEdge;
                    crossTalks.push(cc);
                }
            }
        }
        //var layer = elements.elements[e.source].layer;
        //var lvl = crossTalks[layer];
        //if (!lvl) {
        //    lvl = [];
        //    crossTalks[layer] = lvl;
        //}
        //lvl.push()
    }

//console.log(crossTalks);
    //console.log(R.countBy(R.pick('lvl',crossTalks))(crossTalks));

//console.log(paths); // <-- Nodes

    /*
     1. Go through cross-talks
     2. Check if edge for this cc exists
     a. Yes: increase weight of edge
     b. No: Add edge
     3. Save maximum weight
     4. Create vis for that network.
     */

    cc = munemo({inFormat: 'csv', data: ""});

    var maxWeight = 0;
    for (i = 0; i < crossTalks.length; i++) {
        //if ( crossTalks[i].src === '' || crossTalks[i].trg === '' ) console.log('EMPTY!');
        var ccId = 'e' + crossTalks[i].src + crossTalks[i].lvl + crossTalks[i].trg + crossTalks[i].lvl;
        if (cc.elements[ccId] === undefined) {
            //var src = cc.func.createNode(

            // check if layer exists or create
            if (cc.elements['l' + crossTalks[i].lvl] === undefined) {
                console.log("Create new layer!");
                //console.log(cc);
                var l = cc.func.createLayer({ id: 'l' + crossTalks[i].lvl } );
                cc.layers.push(l);
                cc.elements['l' + crossTalks[i].lvl] = l;
            }

            // check if both nodes exist
            if (cc.elements['n' + crossTalks[i].src] === undefined) {
                var s = cc.func.createNode({
                    id: 'n' + crossTalks[i].src
                });
                cc.elements['n' + crossTalks[i].src] = s;
                cc.nodes.push(s);
            }

            if (cc.elements['n' + crossTalks[i].trg] === undefined) {
                var t = cc.func.createNode({
                    id: 'n' + crossTalks[i].trg
                });
                cc.elements['n' + crossTalks[i].trg] = t;
                cc.nodes.push(t);
            }

            // check if nodelayers exist for src and trg
            if (cc.elements['nl' + crossTalks[i].src + crossTalks[i].lvl] === undefined) {
                var nl1 = cc.func.createNodelayer({
                    node: crossTalks[i].src,
                    layer: crossTalks[i].lvl
                });
                cc.elements['nl' + crossTalks[i].src + crossTalks[i].lvl] = nl1;
                cc.nodelayers.push(nl1);
            }

            if (cc.elements['nl' + crossTalks[i].trg + crossTalks[i].lvl] === undefined) {
                var nl2 = cc.func.createNodelayer({
                    node: crossTalks[i].trg,
                    layer: crossTalks[i].lvl
                });
                cc.elements['nl' + crossTalks[i].trg + crossTalks[i].lvl] = nl2;
                cc.nodelayers.push(nl2);
            }

            // create missing edge
            var e = cc.func.createEdge({
                source: 'nl' + crossTalks[i].src + crossTalks[i].lvl,
                target: 'nl' + crossTalks[i].trg + crossTalks[i].lvl,
                weight: 1
            });
            cc.elements['e' + e.data.source.substring(2) + e.data.target.substring(2)] = e;
            cc.edges.push(e);

        } else {
            // Get edge and increase weight by 1
            cc.elements[ccId].data.weight = cc.elements[ccId].data.weight + 1;
            for (var k = 0; k < cc.edges.length; k++) {
                var edge = cc.edges[k];
                if (edge.data.id = ccId) {
                    edge.data.weight = edge.data.weight + 1;
                    if ( edge.data.weight > maxWeight ) maxWeight = edge.data.weight;
                    break;
                }
            }
        }
    }
    cc.maxWeight = maxWeight;
    calcPosition(cc);
    //console.log(cc);
    var weights = {name: input};
    cc.layers.forEach(function (l) {
        //console.log(l.data.id.substr(1));
        weights[l.data.id.substr(1)] = calcWeightSum(l.data.id.substr(1), cc);
    });
    cc.weights = weights;
    console.log(weights);
    //var layer = "Interactionbetweenpathwaymembers";
    //console.log(calcWeightSum(layer, cc));
    //var isInLayer = function (nl) {
    //    return cc.elements.elements[nl.data.target].data.layer === layer;
    //};
    //var subSet = R.filter(isInLayer, cc.elements.elements);
    //console.log(subSet);
    //console.log(cc.func.getWeights("Interactionbetweenpathwaymembers"));



    //cc.func.calcVertexDegrees(function () {
    //
    //}, function (avg) {
    //    console.log("Average vertex degree: " + avg);
    return cc;
    //});
}

//console.log(JSON.stringify(cc));

//for ( i=0; i < edges.length; i++ ) {
//    var row = edges[i];
//    for ( var j=0; j < paths.length; j++ ) {
//        var re = new RegExp(paths[j]);
//        if ( row.data.srcPath.match(re) )  {
//            object[paths[j]].outgoing++;
//        }
//        if ( row.data.trgPath.match(re) )  {
//            object[paths[j]].incoming++;
//        }
//    }
//}

/*
 3 Nodes per layer -> Pathways
 1) Parse layers
 2) create nodes
 */

// Discard nodes without connection to relevant nodes


//var nodes = ['TGF', 'Notch', 'WNT'];
//var object = {};
//// Init object
//for ( var i=0; i < nodes.length; i++ ) {
//    object[nodes[i]] = {
//        incoming: 0,
//        outgoing: 0
//    };
//}
//
//console.log(object);
//
//var pathways = [];
//for ( i=0; i < data.length; i++ ) {
//    var row = data[i];
//    for ( var j=0; j < nodes.length; j++ ) {
//        var re = new RegExp(nodes[j]);
//        if ( row.source_pathways.match(re) )  {
//            object[nodes[j]].outgoing++;
//        }
//        if ( row.target_pathways.match(re) )  {
//            object[nodes[j]].incoming++;
//        }
//    }
//    pathways.push(row.source_pathways);
//    pathways.push(row.target_pathways);
//}
//
//console.log(object);

function calcWeightSum(layer, network) {
    var subSet = {};
    if (layer !== undefined) {
        // filter just this layer.
        for (var e2 in network.elements) {
            if (network.elements.hasOwnProperty(e2)){
                var current = network.elements[e2];
                if (current.group === 'edges') {
                    if (network.elements[current.data.target].data.layer === layer) {
                        subSet[e2] = current;
                    }
                }
            }
        }
    } else {
        subSet = network.elements;
    }
    // Count interactions in this layer
    var sum = 0;
    for (var o in subSet) {
        if (subSet.hasOwnProperty(o)) {
            sum += subSet[o].data.weight;
        }
    }
    return sum;

}

function parse(input, header) {
    input = input.replace(/ /g, ''); //remove whitespace
    if (!header) header = false;
    return Baby.parse(input, {
        header: header,
        skipEmptyLines: true,
        delimiter: ";"
    }).data;
}

function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i] !== arr2[i])
            return false;
    }

    return true;
}

function calcPosition( network ) {
    var radius = network.nodes.length * 150;
    var n = network.nodes.length;
    var segmentAngle = (2 * Math.PI) / n;
    network.nodelayers.forEach(function (nl) {
        var node = network.elements['n' + nl.data.node];
        var angle = segmentAngle * network.nodes.indexOf(node);
        var x = radius * Math.cos(angle);
        var y = radius * Math.sin(angle);
        nl.position = {};
        nl.position.x = x;
        nl.position.y = y;
        nl.position.z = 0;
    })
}

module.exports = analyze;