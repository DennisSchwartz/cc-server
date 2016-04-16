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
        res.writeHead(200, {'Content-Type': 'text/json'});
        res.end(JSON.stringify(model));
    }
    next();
});

app.post("/create", function (req, res, next) {
    res.status(200).setHeader("content-type", "application/json");
    var network = createAndAnalyse(req);
    // Save to file
    var date = new Date();
    var ws = fs.createWriteStream('./results/' + req.body.url.split('.')[0] + "-"  + date.toISOString() + ".json");
    var networkString = JSON.stringify(network);
    ws.write(networkString, function (err) {
        ws.end();
    });
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



    console.log("Nodelayers.length: " + network.nodelayers.length);
    console.log("elements.length: " + Object.keys(network.elements).length);
    //console.log(nls);

    //network.func.calcNodelayerDegrees();
    //
    //
    //length = network.nodelayers.length;
    //console.log("length: " + length);
    //for ( i = 0; i < length; i++ ) {
    //    var nl = network.nodelayers.pop();
    //    if (nl.data.degree > 0) {
    //        network.nodelayers.unshift(nl);
    //    } else {
    //        delete network.elements['nl' + nl.data.id];
    //        console.log("Deleting nodelayer! \r");
    //    }
    //    //process.stdout.write("Deleting nls w/ deg == 0: " + ( (i / length) * 100 ).toFixed(2) + "% \r");
    //    //process.stdout.write("Deleting nls w/ deg == 0: " + nl.data.degree + "\r");
    //    console.log(nl.data.degree);
    //
    //}
    //console.log("\n" + network.nodelayers.length);

    //nls = R.uniq(nls);
    //
    //var nodes = {
    //    ids: [],
    //    elements: {}
    //};
    //
    //
    //for ( i = 0; i < network.nodelayers.length; i++ ) {
    //    if (!R.contains('nl' + network.nodelayers[i].data.id, nls)) {
    //        network.nodelayers.splice(i, 1);
    //        delete network.elements['nl' + network.nodelayers[i].data.id];
    //    } else {
    //        var nodeID = 'n' + network.nodelayers[i].data.node;
    //        nodes.elements[nodeID] = network.elements[nodeID];
    //        nodes.ids.push(nodeID);
    //    }
    //}
    //console.log(network.nodelayers.length);
    //console.log(Object.keys(network.elements).length);
    //
    //
    //for (var el in network.elements) {
    //    if (network.elements.hasOwnProperty(el)) {
    //        if (el.group === 'nodes') delete network.elements[el];
    //    }
    //}
    //for (el in nodes.elements) {
    //    if (nodes.elements.hasOwnProperty(el)) {
    //        network.elements[el] = nodes.elements[el];
    //    }
    //}
    //
    //var newNodes = [];
    //nodes.ids.forEach(function (n) {
    //    for ( var j = 0; j < network.nodes.length; j++ ) {
    //        if (network.nodes[j].data.id === n) {
    //            newNodes.push(network.nodes[j]);
    //            break;
    //        }
    //    }
    //});
    //network.nodes = newNodes;

    //Possibly: Remove NLs not on given layers

    //console.log(network.nodes);


    res.end(JSON.stringify(network));
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
        network = munemo( { inFormat: 'csv', data: req.body.file, opts: { paths: true } });
    }

    // Sort for cross file comparison:
    var fsort = R.sortBy(R.path(['data', 'id']));
    network.nodes = fsort(network.nodes);
    network.layers = fsort(network.layers);
    //res.send("Number of Nodes: " + network.nodes.length);
    //res.send("Number of Nodelayers: " +  network.nodelayers.length);
    //res.send("Number of Layers: " + network.layers.length);

    var weights = {name: req.body.url};
    network.layers.forEach(function (l) {
        console.log(l.data.id.substr(1));
        weights[l.data.id.substr(1)] = calcWeightSum(l.data.id.substr(1), network);
    });
    network.weights = weights;
    network.func.createMultiplexAdjacencyArray();
    network.func.calcVertexDegrees();
    network.func.calcNodelayerDegrees();
    network.func.calcLayerStrength();
    network.func.calcDegreeEntropy();
    network.func.calcParticipationCoefficient();

    return network;
}