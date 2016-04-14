/**
 * Created by ds on 28/03/2016.
 */

var munemo = require('biojs-io-munemo');
var R = require('ramda');

var utils = {

    aggregate: function (input) {
        var agg = munemo({inFormat: 'csv', data: ""});
        // Add an empty layer to agg
        var aggLayer = agg.func.createLayer({id: 'lAggregate'});
        agg.elements['lAggregate'] = aggLayer;
        agg.layers.push(aggLayer);


        // Add all nodes
        input.nodes.forEach(function (n) {
            agg.elements[n.data.id] = n;
            agg.nodes.push(n);
            var nl = agg.func.createNodelayer({
                node: n.data.id.substr(1),
                layer: 'Aggregate'
            });
            agg.elements['nl' + nl.data.id] = nl;
            agg.nodelayers.push(nl);
        });

        // Add all edges with summed weights
        var maxWeight = 0;
        for (var i = 0; i < input.edges.length; i++) {
            var e = input.edges[i];
            var id = 'e' + input.elements[e.data.source].data.node + 'Aggregate'
                + input.elements[e.data.target].data.node + 'Aggregate';
            if (agg.elements[id] === undefined) {
                // Add new edge
                var ne = agg.func.createEdge({
                    source: 'nl' + input.elements[e.data.source].data.node + 'Aggregate',
                    target: 'nl' + input.elements[e.data.target].data.node + 'Aggregate',
                    weight: 1
                });
                agg.elements[id] = ne;
                agg.edges.push(ne);
            } else {
                // Get edge and increase weight by 1
                agg.elements[id].data.weight = agg.elements[id].data.weight +
                    input.edges[i].data.weight;
                for (var k = 0; k < input.edges.length; k++) {
                    var edge = input.edges[k];
                    if (edge.data.id = id) {
                        edge.data.weight = edge.data.weight + input.edges[i].data.weight;
                        if (edge.data.weight > maxWeight) maxWeight = edge.data.weight;
                        break;
                    }
                }
            }
        }

        agg.maxWeight = maxWeight;

        return agg;


        //for (i = 0; i < crossTalks.length; i++) {
        //    //if ( crossTalks[i].src === '' || crossTalks[i].trg === '' ) console.log('EMPTY!');
        //    var ccId = 'e' + crossTalks[i].src + crossTalks[i].lvl + crossTalks[i].trg + crossTalks[i].lvl;
        //    if (cc.elements[ccId] === undefined) {
        //        //var src = cc.func.createNode(
        //
        //        // check if layer exists or create
        //        if (cc.elements['l' + crossTalks[i].lvl] === undefined) {
        //            console.log("Create new layer!");
        //            //console.log(cc);
        //            var l = cc.func.createLayer({id: 'l' + crossTalks[i].lvl});
        //            cc.layers.push(l);
        //            cc.elements['l' + crossTalks[i].lvl] = l;
        //        }
        //
        //        // check if both nodes exist
        //        if (cc.elements['n' + crossTalks[i].src] === undefined) {
        //            var s = cc.func.createNode({
        //                id: 'n' + crossTalks[i].src
        //            });
        //            cc.elements['n' + crossTalks[i].src] = s;
        //            cc.nodes.push(s);
        //        }
        //
        //        if (cc.elements['n' + crossTalks[i].trg] === undefined) {
        //            var t = cc.func.createNode({
        //                id: 'n' + crossTalks[i].trg
        //            });
        //            cc.elements['n' + crossTalks[i].trg] = t;
        //            cc.nodes.push(t);
        //        }
        //
        //        // check if nodelayers exist for src and trg
        //        if (cc.elements['nl' + crossTalks[i].src + crossTalks[i].lvl] === undefined) {
        //            var nl1 = cc.func.createNodelayer({
        //                node: crossTalks[i].src,
        //                layer: crossTalks[i].lvl
        //            });
        //            cc.elements['nl' + crossTalks[i].src + crossTalks[i].lvl] = nl1;
        //            cc.nodelayers.push(nl1);
        //        }
        //
        //        if (cc.elements['nl' + crossTalks[i].trg + crossTalks[i].lvl] === undefined) {
        //            var nl2 = cc.func.createNodelayer({
        //                node: crossTalks[i].trg,
        //                layer: crossTalks[i].lvl
        //            });
        //            cc.elements['nl' + crossTalks[i].trg + crossTalks[i].lvl] = nl2;
        //            cc.nodelayers.push(nl2);
        //        }
        //
        //        // create missing edge
        //        var e = cc.func.createEdge({
        //            source: 'nl' + crossTalks[i].src + crossTalks[i].lvl,
        //            target: 'nl' + crossTalks[i].trg + crossTalks[i].lvl,
        //            weight: 1
        //        });
        //        cc.elements['e' + e.data.source.substring(2) + e.data.target.substring(2)] = e;
        //        cc.edges.push(e);
        //
        //    } else {
        //        // Get edge and increase weight by 1
        //        cc.elements[ccId].data.weight = cc.elements[ccId].data.weight + 1;
        //        for (var k = 0; k < cc.edges.length; k++) {
        //            var edge = cc.edges[k];
        //            if (edge.data.id = ccId) {
        //                edge.data.weight = edge.data.weight + 1;
        //                if (edge.data.weight > maxWeight) maxWeight = edge.data.weight;
        //                break;
        //            }
        //        }
        //    }
        //
        //
        //}
    },
    getRegulators: function (network, pathways, layers) {

        var unique = R.uniqBy(R.path(['data', 'id']));

        var transcriptSubset = R.filter(function (e) {
            var inLayers = false;
            for ( var i = 0; i < layers.length; i++ ) {
                inLayers = e.data.source.indexOf(layers[i]) > 0;
                if (inLayers) break;
            }
            return inLayers
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

    }//,
    //newNetFromEdges: function (edges) {
    //    var newNet = munemo({inFormat: 'csv', data: ""});
    //
    //    newNet.elements.edges = edges;
    //    edges.forEach(function (e) {
    //        // Add to edgelist
    //        newNet.elements.elements['e' + e.data.id] = e;
    //        // Check if NL exist
    //        if ( newNet.elements.elements[e.data.source] === undefined ) {
    //            //
    //        }
    //        // If not check for nodes and layers
    //
    //        // Create anyting that's missing
    //
    //
    //    });
    //}
};

module.exports = utils;