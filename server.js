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
        console.log(model);
        res.writeHead(200, {'Content-Type': 'text/json'});
        res.end(JSON.stringify(model));
    }
    next();
});

app.post("/create", function (req, res, next) {
    res.status(200).setHeader("content-type", "text/plain");
    //var Readable = require('stream').Readable;
    //var s = new Readable();
    //s.pipe(res);
    //s.push("Test!!");
    //s.push(null);
    //res.write('Received path: ' + req.body.url);
    //res.send('Received path: ' + req.body.url);
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
    //res.send("Number of Nodes: " + network.nodes.length);
    //res.send("Number of Nodelayers: " +  network.nodelayers.length);
    //res.send("Number of Layers: " + network.layers.length);

    var weights = {name: req.body.url};
    network.layers.forEach(function (l) {
        //console.log(l.data.id.substr(1));
        weights[l.data.id.substr(1)] = calcWeightSum(l.data.id.substr(1), network);
    });
    network.weights = weights;
    network.func.createMultiplexAdjacencyArray();
    network.func.calcVertexDegrees();
    network.func.calcLayerStrength();
    network.func.calcDegreeEntropy();
    network.func.calcParticipationCoefficient();

    // Save to file
    var date = new Date();
    var ws = fs.createWriteStream(date.toISOString() + "-" + req.body.url.split('.')[0] + ".json");
    ws.write(JSON.stringify(network), function (err) {
        ws.end();
    });
    res.end();//JSON.stringify(network));
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