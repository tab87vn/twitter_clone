var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var assert = require('assert');
var mongo = require('mongodb').MongoClient;
var AM = require('./account-manager.js');
var kafka = require('kafka-node');

var app = module.exports = express();

////////////////////////////////////////////////////////////////////////////////

app.set('env', 'development');

////////////////////////////////////////////////////////////////////////////////
// MIDDLEWARE

app.param('tweetlist', function(req, res, next, collectionName){
  req.collection = db.collection(collectionName)
  return next()
});

app.use(cookieParser());
app.use(session({ secret: 'whateverItIs',
                  saveUninitialized: true,
                  resave: true}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// serve static content from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// parse the parameters of POST requests (available through `req.body`)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// routes
app.use('/', require('./routes.js'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

////////////////////////////////////////////////////////////////////////////////
// ERROR HANDLERS

// development error handler, will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        console.log('[' + err.status + '] ' + err.message);
        res.render('template', {
            title: 'Error',
            partial: 'error',
            message: err.message,
            error: err
        });
    });
}

// production error handler, no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('template', {
        title: 'Error',
        partial: 'error',
        message: err.message,
        error: {}
    });
});

////////////////////////////////////////////////////////////////////////////////
// START APP

// 1) Connect to MongoDB
// 2) Connect to Kafka
// 3) Start the HTTP server
    mongo.connect('mongodb://localhost:27017/twitter', function(err, db) {
    
        // TODO: error handling
        //assert(!err);
        console.log("connected to MongoDB");

        // get db connection
        app.db = db;

        // test data
        //var test = db.collection('userlist').find({"username":"votes027"});
        //console.log(test);

        // get list of users
        app.userlist = db.collection('userlist');
        app.tweetlist = db.collection('tweetlist');

        // connecting to kafka service 
        var client = new kafka.Client('localhost:2181');
        if (client) {
            app.producer = new kafka.Producer(client);
        }
        //console.log(client);
        //console.log(app.producer);

        //Create topics sync
         app.producer.createTopics(['tweets'], false, function (err, data) {
             console.log(data);  
         });
        // Create topics async
        //app.producer.createTopics(['t'], true, function (err, data) {});
        //app.producer.createTopics(['t'], function (err, data) {});// Simply omit 2nd arg

        //create test data to push
        //  var payloads = [
        //     { topic: 'topic_6', messages: 'hi, this is a sample post to test1'},
        //     { topic: 'topic_6', messages: ['hello', 'world2'] },
        //     { topic: 'topic_7', messages: ['hello', 'world2'] }
        // ];

        // app.producer.on('ready', function () {
        //     app.producer.send(payloads, function (err, data1) {
        //         console.log(data1);
        //     });
        // });


        var server = app.listen(3009, function () {
            var host = server.address().address;
            var port = server.address().port;
            console.log('listening at http://%s:%s', host, port);
        });
});

////////////////////////////////////////////////////////////////////////////////
