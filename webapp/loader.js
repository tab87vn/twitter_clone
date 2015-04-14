var fs = require('fs');
var byline = require('byline');
var mongo = require('mongodb').MongoClient;
var assert = require('assert');
var AM = require('./account-manager.js');
var noop = function() {};

mongo.connect('mongodb://localhost:27017/twitter', function(err, db) {

  assert.equal(null, err);  
  userlist  = db.collection('userlist');
  tweetlist = db.collection('tweetlist');
  console.log("connected correctly to server");
  var lineCount     = 0;
  var readAllLines  = false;
  userlist.remove({}, noop);
  tweetlist.remove({}, noop);

  function callback(err) {
      readAllLines = true;
  }

  // TODO: empty the database
  
  // var semaphore = 2;
  // function callback(err) {
  //     --semaphore;
  //     if (semaphore !== 0) return;
  //       readAllLines = true;
  // }

  var u = byline(fs.createReadStream(__dirname + '/users.json'));

  u.on('data', function(line) {
    try {
      lineCount++;
      var obj = JSON.parse(line);
      //console.log(obj);
      //console.log("hello world");
      AM.addNewAccount(obj, userlist, function() {
        if (--lineCount === 0 && readAllLines) {
            // we've read and inserted all lines
            //db.close();
            console.log("data inserted successfully and db is closed now!");
        }
      });
      // NOTE: obj represents a user and contains three fields:
      // obj.username: the username
      // obj.name: the full name
      // obj.followers: array of users following this user
      // obj.following: array of followed users

      // TODO: load the user into the database
      // (including the information of which users this user is following)
      // decrement the lineCount variable after every insertion
      // if lineCount is equal to zero and readAllLines is true, close db connection
      // using db.close()
      

    } catch (err) {
      console.log("Error:", err);
    }
  });

  u.on('end', callback);


  var t = byline(fs.createReadStream(__dirname + '/sample.json'));

  t.on('data', function(line) {
    try {
      lineCount++;
      var obj = JSON.parse(line);
      console.log(obj);
      // NOTE: obj represents a tweet and contains three fields:
      // obj.created_at: UTC time when this tweet was created
      // obj.text: The actual UTF-8 text of the tweet
      // obj.username: The user who posted this tweet

      // TODO: load the tweet into the database
      // decrement the lineCount variable after every insertion
      // if lineCount is equal to zero and readAllLines is true, close db connection
      // using db.close()      

      AM.populateTweets(obj, tweetlist, function() {
        if (--lineCount === 0 && readAllLines) {
            // we've read and inserted all lines
            db.close();
            console.log("all tweets have been inserted successfully and db is closed now!");

        }
      });

    } catch (err) {
      console.log("Error:", err);
    }
  });
  t.on('end', callback);

});
