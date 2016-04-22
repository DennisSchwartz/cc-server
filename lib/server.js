//Lets require/import the HTTP module
var http = require('http');
//Lets define a port we want to listen to
const PORT=8080;

var express = require('express');
var app = express();
server = http.createServer(app);
var bodyParser = require('body-parser');
var crossTalks = require('./cross-talk-analysis');
var fs = require('fs');
var munemo = require('biojs-io-munemo');
var utils = require('./utils');
var R = require("ramda");
var serveIndex = require('serve-index');
var csvWriter = require('csv-write-stream')



//CORS middleware
var allowCrossDomain = function(req, res, next) {
    //res.header('Access-Control-Allow-Origin', 'http://localhost:9090');
    //res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    //res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Application, Accept");
    next();
};


//app.use('/data', express.static('data'));
app.use('/data', serveIndex('data', {'icons': false}));
app.use(bodyParser.json());
app.use(allowCrossDomain);

app.get("/", function (req, res, next) {
    var test = crossTalks();
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(JSON.stringify(test));
    next();
});

//app.post("/file", function (req, res, next) {
//    console.log("Request for file received");
//    var input = req.body.fileName;
//    if ( typeof input === 'undefined' ) {
//        input = 'Human-Notch-TGF-WNT-No-TF.csv';
//    }
//    var path = '/Users/ds/Documents/Code/Thesis/BioJS/Data/slk2/' + input;
//    fs.stat(path, function(error, stat) {
//        if (error) {
//            // TODO: Meaningful response
//            //response.writeHead(409, {
//            //
//            //});
//            throw error;
//        }
//        res.writeHead(200, {
//            'Content-Type': 'text/json',
//            'Content-Length' : stat.size
//        });
//        fs.createReadStream(path).pipe(res);
//        next()
//    });
//
//    //file = fs.readFileSync('/Users/ds/Documents/Code/Thesis/BioJS/Data/slk2/' + input, 'utf-8');
//});

app.post("/", function (req, res, next) {
    console.log("Post request received");
    // If url
    if (req.body.type === 'url') {
        var model = crossTalks(req.body.url);
        //console.log(model);
        // Save to file
        var date = new Date();
        var ws = fs.createWriteStream("./results/CrossTalks" + "-" + req.body.url.split('.')[0] + "-" + date.toISOString() + ".json");
        var networkString = JSON.stringify(model);
        ws.write(networkString, function (err) {
            ws.end();
        });

        writeDegrees(model, req.body.url.split('.')[0]);

        res.writeHead(200, {'Content-Type': 'text/json'});
        res.end(JSON.stringify(model));
    }
    next();
});

app.post("/create", function (req, res, next) {
    res.status(200).setHeader("content-type", "application/json");
    var network = createAndAnalyse(req);
    var networkString = JSON.stringify(network);
    if (req.body.type === 'url') {
        // Save to file
        var date = new Date();
        var ws = fs.createWriteStream('./results/' + req.body.url.split('.')[0] + "-" + date.toISOString() + ".json");
        writeDegrees(network, req.body.url.split('.')[0]);
        ws.write(networkString, function (err) {
            ws.end();
        });
    }
    //var layerIDs = R.map(function (i) { return i.data['id'] }, network.layers);
    //layerIDs.unshift('node');
    //var writer = csvWriter({headers: layerIDs});
    //console.log("Writing degrees...");
    //writer.pipe(fs.createWriteStream('Degrees-' + req.body.url.split('.')[0]));
    //cc.nodes.forEach(function (n) {
    //    var res = n.data.degree;
    //    res.unshift(n.data.id.substr(1));
    //    writer.write(res);
    //});
    //writer.end();



    //console.log(networkString);
    res.end(networkString);
    next();
});

app.post("/subset", function (req, res, next) {
    res.status(200).setHeader("content-type", "application/json");
    var network = createAndAnalyse(req);
    if (!req.body.pathways) req.body.pathways = ['Hedgehog', 'WNT/Wingless'];
    if (!req.body.layers) req.body.layers = ['Transcriptionalregulation', 'Post-transcriptionalregulation'];
    var subEdges = utils.getRegulators(network, req.body.pathways, req.body.layers);
    // delete old edges from network



    var length = network.edges.length;
    for ( var i = 0; i < length; i++ ) {
        var e = network.edges.pop();
        if (!delete network.elements['e' + e.data.id]) {
            console.log(e.data.id + " could not be deleted!");
        }
    }

    // fill with new edges
    var nls = [];
    var ls = [];
    var ns = [];
    for (var p in subEdges) {
        if (subEdges.hasOwnProperty(p)) {
            subEdges[p].forEach(function (e) {
                network.edges.push(e);
                network.elements['e' + e.data.id] = e;
                var src = network.elements[e.data.source];
                var trg = network.elements[e.data.target];
                if (src) {
                    nls.push(network.elements[e.data.source]);
                    ls.push(network.elements['l' + src.data.layer]);
                    ns.push(network.elements['n' + src.data.node]);
                }
                if (trg) {
                    nls.push(network.elements[e.data.target]);
                    ls.push(network.elements['l' + trg.data.layer]);
                    ns.push(network.elements['n' + trg.data.node]);
                }
            });
        }
    }


    //var eqSrc = R.pathEq(['data', 'id'], e.data.source);
    //index = R.findIndex(eqSrc)(network.nodelayers);
    //network.nodelayers.splice(index, 1);
    //delete network.elements[e.data.source];
    //
    console.log("nls.length " + nls.length);

    nls = R.uniqBy(R.path(['data', 'id']), nls);
    ls = R.uniqBy(R.path(['data', 'id']), ls);
    ns = R.uniqBy(R.path(['data', 'id']), ns);

    var lIndices = [];
    ls.forEach(function (l) {
        var eql = R.pathEq(['data', 'id'], l.data.id);
        lIndices.push(R.findIndex(eql)(network.layers));
    });
    console.log(lIndices);

    console.log("nls.length " + nls.length);
    console.log("Nodelayers.length: " + network.nodelayers.length);
    console.log("elements.length: " + Object.keys(network.elements).length);

    length = network.nodelayers.length;

    for ( i = 0; i < length; i++ ) {
        var nl = network.nodelayers.pop();
        delete network.elements['nl' + nl.data.id];
    }

    console.log("Nodelayers.length: " + network.nodelayers.length);
    console.log("elements.length: " + Object.keys(network.elements).length);
    // Add back unique nls
    nls.forEach(function (nl) {
        network.elements['nl' + nl.data.id] = nl;
        network.nodelayers.push(nl);
    });

    console.log(network.layers);
    console.log(ls);
    length = network.layers.length;
    for ( i = 0; i < length; i++ ) {
        var l = network.layers.pop();
        delete network.elements[l.data.id];
    }

    ls.forEach(function (l) {
        network.elements[l.data.id] = l;
        network.layers.push(l);
    });
    console.log(network.layers);


    length = network.nodes.length;
    for ( i = 0; i < length; i++ ) {
        var n = network.nodes.pop();
        delete network.elements[n.data.id];
    }


    ns.forEach(function (n) {
        if (n.data.degree) {
            var news = [];
            for (var i = 0; i < lIndices.length; i++) {
                news[i] = n.data.degree.splice(lIndices[i],1);
            }
            n.data.degree = news;
        }
        network.elements[n.data.id] = n;
        network.nodes.push(n);
    });


    // Create manual layout:

    //var n = network.nodes.length;
    //var radius = n * 10 + 10 * state.nodesize ; //* 150;
    //var segmentAngle = (2 * Math.PI) / n;
    //var createIdList = R.map(function (i) { return i.data['id'] });
    //var layers = createIdList(network.layers);
    //var sortedNodes = R.sortBy(R.path(['data', 'degree']), network.nodes);
    //var nodes = createIdList(sortedNodes);
    //console.log("Order in circle layout: ", nodes);
    //network.nodelayers.forEach(function (nl) {
    //    var node = network.elements['n' + nl.data.node];
    //    var layer = network.elements['l' + nl.data.layer];
    //    var nodelayer = network.elements['nl' + nl.data.id];
    //    var angle = segmentAngle * nodes.indexOf(node.data.id);
    //    var x = radius * Math.cos(angle);
    //    var y = radius * Math.sin(angle);
    //    nodelayer.position = {};
    //    nodelayer.position.x = x;
    //    nodelayer.position.y = y;
    //    nodelayer.position.z = layers.indexOf(layer.data.id) * state.interLayerDistance;
    //});
    //for (i = 0; i < req.body.pathways.length + 2; i++ ) {
    //    // Get all relevant nodes
    //    var pw = req.body.pathways[i];
    //
    //}

    // Set offsets:
    n = req.body.pathways.length + 2;
    var C = 2 * n * (network.nodes.length / n) * 20;
    var radius = C / ( 2 * Math.PI );
    var segmentAngle = (2 * Math.PI) / n;
    console.log("segAngle:", segmentAngle);
    var offsets = {};
    // Calc offets:
    for (i = 0; i < req.body.pathways.length; i++) {
        offsets[req.body.pathways[i]] = {
            x: radius * Math.cos(segmentAngle * i),
            y: radius * Math.sin(segmentAngle * i),
            count: 0
        }
    }
    console.log("I: ", i);
    offsets["mutual"] = {
        x: radius * Math.cos(segmentAngle * i),
        y: radius * Math.sin(segmentAngle * i),
        count: 0
    };
    i++;
    offsets["none"] = {
        x: radius * Math.cos(segmentAngle * i),
        y: radius * Math.sin(segmentAngle * i),
        count: 0
    };

    console.log(offsets);

    var createIdList = R.map(function (i) { return i.data['id'] });
    var layers = createIdList(network.layers);
    var sortedNodes = R.sortBy(R.path(['data', 'degree']), network.nodes);
    var nodes = createIdList(sortedNodes);
    network.nodelayers.forEach(function (nl) {
        var nodeClass = 'none';
        var pathwayString = nl.data.pathways.join();
        if (pathwayString.indexOf(req.body.pathways[0]) > -1 &&
            pathwayString.indexOf(req.body.pathways[1]) === -1) {
            nodeClass = req.body.pathways[0];
        }
        if (pathwayString.indexOf(req.body.pathways[0]) > -1 &&
            pathwayString.indexOf(req.body.pathways[1]) > -1 ) {
            nodeClass = 'mutual';
        }
        if (pathwayString.indexOf(req.body.pathways[0]) === -1 &&
            pathwayString.indexOf(req.body.pathways[1]) > -1 ) {
            nodeClass = req.body.pathways[1];
        }
        nl.data.nodeClass = nodeClass;
        nl.data.angleCount = offsets[nodeClass].count;
        offsets[nodeClass].count++;
    });
    network.nodelayers.forEach(function (nl) {

        n = offsets[nl.data.nodeClass].count;
        C = 2 * n * 30;
        radius = C / ( 2 * Math.PI );
        segmentAngle = (2 * Math.PI) / n;
        var xOffset = offsets[nl.data.nodeClass].x;
        var yOffset = offsets[nl.data.nodeClass].y;
        console.log(xOffset, yOffset, nl.data.nodeClass, nl.data.pathways.join());
        //var node = network.elements['n' + nl.data.node];
        var layer = network.elements['l' + nl.data.layer];
        var nodelayer = network.elements['nl' + nl.data.id];
        var angle = segmentAngle * nl.data.angleCount;
        var x = xOffset + radius * Math.cos(angle);
        var y = yOffset + radius * Math.sin(angle);
        nodelayer.position = {};
        nodelayer.position.x = x;
        nodelayer.position.y = y;
        nodelayer.position.z = layers.indexOf(layer.data.id) * 200;
    });


    console.log("Nodelayers.length: " + network.nodelayers.length);
    console.log("elements.length: " + Object.keys(network.elements).length);
    var cc = crossTalks({ from: 'network', network: network});
    var result = {
        network: network,
        cc: cc
    };

    res.end(JSON.stringify(result));
    next();
});

app.post("/aggregate", function (req, res, next) {
    var network = JSON.parse(req.body.network);
    var agg = utils.aggregate(network);
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(JSON.stringify(agg));
    next();
});


////We need a function which handles requests and send response
//function handleRequest(request, response){
//    try {
//        // log the request on console
//        //console.log(request.url);
//        // dispatch
//        dispatcher.dispatch(request, response);
//    } catch(err) {
//        console.log(err);
//        console.log("ERROR!");
//    }
//}
//
//dispatcher.setStatic('data');
//
//dispatcher.onGet('/model', function (req, res) {
//    res.setHeader('Content-Type', 'text/json');
//    res.statusCode = 200;
//    res.end({"test": "haha"});
//});
//
////Create a server
//var server = http.createServer(handleRequest);
//
//Lets start our server
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});


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

function createAndAnalyse (req) {
    console.log("Creating Network Model");
    var network;
    if (req.body.type === 'url') {
        var file = fs.readFileSync('/Users/ds/Documents/Code/Thesis/BioJS/Data/slk2/' + req.body.url, 'utf-8');
        network = munemo( { inFormat: 'csv', data: file, opts: { paths: true } });
    } else if (req.body.type === 'file') {
        network = munemo( { inFormat: 'csv', data: req.body.file, opts: { paths: false } });
    }
    console.log(req.body.file);
    //
    // Sort for cross file comparison:
    var fsort = R.sortBy(R.path(['data', 'id']));
    network.nodes = fsort(network.nodes);
    network.layers = fsort(network.layers);
    //res.send("Number of Nodes: " + network.nodes.length);
    //res.send("Number of Nodelayers: " +  network.nodelayers.length);
    //res.send("Number of Layers: " + network.layers.length);

    //var weights = {name: req.body.url};
    //network.layers.forEach(function (l) {
    //    console.log(l.data.id.substr(1));
    //    weights[l.data.id.substr(1)] = calcWeightSum(l.data.id.substr(1), network);
    //});
    //network.weights = weights;
    //network.func.createMultiplexAdjacencyArray();
    //network.func.calcVertexDegrees();
    //network.func.calcNodelayerDegrees();
    //network.func.calcLayerStrength();
    //network.func.calcDegreeEntropy();
    //network.func.calcParticipationCoefficient();
    //


    return network;
}


function writeDegrees (model, name) {
    var layerIDs = R.map(function (i) { return i.data['id'] }, model.layers);
    // Sort layers
    var order = ["lTranscriptionalregulation", "lPost-translationalmodification", "lDirectedprotein-proteininteraction",
            "lPathwayregulation", "lInteractionbetweenpathwaymembers" ];
    //var move = function (array, from, to) {
    //    array.splice(to, 0, this.splice(from, 1)[0]);
    //    return array;
    //};
    //for (var i = layerIDs.length; i < order.length; i++) {
    //    layerIDs.push('');
    //}
    //
    //var ids = ["lDirectedprotein-proteininteraction",
    //    "lInteractionbetweenpathwaymembers",
    //    "lPathwayregulation",
    //    "lPost-translationalmodification"];
    //
    //var ndeg = [0, 2, 3, 4];
    //for (var j = ndeg.length; j < order.length; j++) {
    //    ndeg.push(-1);
    //} // ndeg = [0, 2, 3, 4, -1]
    //
    //var newDeg = Array.apply(null, Array(order.length)).map(Number.prototype.valueOf, -1);
    //for (i = 0; i < ids.length; i ++) {
    //    var target = order.indexOf(ids[i]);
    //    newDeg[target] = ndeg[i];
    //}


    console.log("Writing degrees...");

    var out = ['Pathway'].concat(order).join(',') + '\n';
    model.nodes.forEach(function (n) {
        // Sort res
        var res = Array.apply(null, Array(order.length)).map(Number.prototype.valueOf, 0); //n.data.degree;
        for (var i = 0; i < layerIDs.length; i ++) {
            var target = order.indexOf(layerIDs[i]);
            res[target] = n.data.degree[i];
        }
        res = res.map(String);
        res = [n.data.id.substr(1)].concat(res);
        out = out +  res.join(',') + '\n';
        //console.log(writeStr.write(res.join(',') + '\n'));
        console.log(n.data.id.substr(1) + " sum of weights: " + R.sum(n.data.degree));

    });
    //writer.end();
    fs.writeFileSync('Degrees-' + name + '.csv', out);
    //fs.writeFileSync('Degree.csv', out);

}