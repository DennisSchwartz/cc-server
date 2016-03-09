//Lets require/import the HTTP module
var http = require('http');
//Lets define a port we want to listen to
const PORT=8080;

var express = require('express');
var app = express();
server = http.createServer(app);
var bodyParser = require('body-parser')
var crossTalks = require('./analyze');



//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:9090');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};


app.use('/data', express.static('data'));
app.use(bodyParser.json());
app.use(allowCrossDomain);

app.get("/", function (req, res, next) {
    var test = crossTalks();
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(JSON.stringify(test));
    next();
});

app.post("/", function (req, res, next) {
    console.log("Post request received");
    // If url
    if (req.body.type === 'url') {
        var model = crossTalks(req.body.url);
        res.writeHead(200, {'Content-Type': 'text/json'});
        res.end(JSON.stringify(model));
    }
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
