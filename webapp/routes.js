var express = require('express');
var assert = require('assert');
var app = require('./app.js');
var ejs = require('ejs');
var fs = require('fs');
var AM = require('./account-manager.js');
var moment  = require('moment');
var router = express.Router();


////////////////////////////////////////////////////////////////////////////////

function setDisplayDate(tweetsToDisplay) {
    tweetsToDisplay.forEach(function(tweet) {
        tweet.display_time = new Date(tweet.created_at).toString();
    });
    return tweetsToDisplay;
}

// NOTE(norswap): This method is necessary because, annoyingly, EJS does not
//  support dynamic includes (including a file whose name is passed via the
//  dictionary -- it has to be hardcoded in the template instead).
function render(res, dict) {
    fs.readFile('views/'+ dict.partial + '.ejs', 'utf-8', function(err, data) {
        assert(!err);
        dict.partial = ejs.render(data, dict);
        res.render('template', dict);
    });
}

////////////////////////////////////////////////////////////////////////////////
// Login page

router.get('/', function(req, res) {
    // TODO: Render login page unless the user is already logged in.
    // In this case, redirect the user to /home
    if (!req.session.user) {
        return res.render('login', 
            {title: 'TwitterClone :: Login'}
        );        
    }
});

////////////////////////////////////////////////////////////////////////////////
// Login / Logout

router.post('/validate', function(req, res) {
    // TODO: Implement user login given req.param('username'), req.param('password')
    AM.manualLogin (
        req.body.username,
        req.body.password,
        app.userlist,
        function(err, user) {
            //assert(!err);
            res.setHeader('content-type', 'application/json');

            if (!user) {
                res.statusCode = 403;
                var o = {message: err.message};
                res.send(JSON.stringify(o));
                return;
            }

            // login successful
            req.session.user = user;
            var fullUrl = req.protocol + '://' + req.get('host') + '/home';
            var o = {message: 'OK', url: fullUrl}
            res.statusCode = 200;
            res.send(JSON.stringify(o));
        }
    );
});

router.post('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});

////////////////////////////////////////////////////////////////////////////////
// User Profile

router.get('/usr/:username', function(req, res) {
    // if user is not logged in redirect back to login page
    if (req.session.user == null) {
        // if user is not logged in redirect back to login page
        res.redirect('/');
        return;
    }

    // TODO: render user req.params.username profile (profile.ejs)
    var usn = req.params.username;
    var _following = false;
    var fullname = "";

    var condition = {username:req.session.user.username, following:usn};

    // decide if the viewed user is aleady be followed
    app.userlist.findOne(condition, function(e, o) {
        if (o == null) {
            _following = false;
        } else {
            _following = true;
        }
    });

    // view user's details and
    // list his/her 10 most recent tweets 
    app.tweetlist.find({username:usn}).sort( { created_at: -1 } ).limit(10).toArray(function(e, list) {
        app.userlist.findOne({username:usn}, function(e, o) {
            render(res, {
                title: 'TwitterClone :: ' + usn,
                partial: 'profile',
                current_user: req.session.user.username,
                username: usn,
                fullname: o['name'],
                tweets: setDisplayDate(list),
                following: _following
            });
        });
    }); 

});

router.get('/usr/:username/following', function(req, res) {
    // TODO: render users following user req.params.username
    var usn = req.params.username;
    var condition = {"username":usn};
    
    app.userlist.findOne(condition, function(e, result) {
        render(res, {
            title: 'TwitterClone :: Users followed by ' + usn,
            partial: 'follow',
            username: usn,        
            follow: result['following']
        });  
    });
});

router.get('/usr/:username/followers', function(req, res) {
    // TODO: render users followed by user req.params.username
    var usn = req.params.username;
    var condition = {"username":usn};
    app.userlist.findOne(condition, function(e, result) {
        render(res, {
            title: 'TwitterClone :: Followers of' + usn,
            partial: 'follow',
            username: usn,        
            follow: result['followers']
        });         
    });
});

// follow a user
router.post('/follow', function(req, res) {
    // if user is not authenticated
    if (!req.session.user) {
        res.statusCode = 403;
        var o = {message: "User is not authenticated!"};
        res.send(JSON.stringify(o));
        return;
    }

    var followed_user = req.body.followed_user;
    var following_user = req.body.following_user;
    
    // check
    console.log(following_user + " is going follow " + followed_user); 

    var userlist = app.userlist;

    // check condition from both side: followed user and following user
    var condition = { $or: [{username:following_user, following:followed_user}, 
                            {username:followed_user, followers:following_user}] 
                    };


    // make sure that one user can be followed only once
    userlist.findOne(condition, function(e, o) {
        if (o){
            //callback('already-followed');
            console.log("You are already following " + followed_user); 
            return false;
        } else {
            // update current user's list of following users
            userlist.update(    
                {username:following_user}, 
                {$push:{following:followed_user}}, 
                {w:1}, 
                function(err, result) {
                    if (err) {
                        res.statusCode = 500;
                        var o = {message: err.message};
                        res.send(JSON.stringify(o));
                        return;
                    }
                }
            );
            // update target user's list of users followed
            userlist.update(    
                {username:followed_user}, 
                {$push:{followers:following_user}}, 
                {w:1}, 
                function(err, result) {
                    if (err) {
                        res.statusCode = 500;
                        var o = {message: err.message};
                        res.send(JSON.stringify(o));
                        return;
                    }                    
                }
            );

            // return 
            res.statusCode = 200;
            var fullUrl = req.protocol + '://' + req.get('host') + '/home';                    
            var o = {message: 'unfollowed successfully!', url: fullUrl}
            res.send(JSON.stringify(o));
        }       
    });
});


// unfollow a user
router.post('/unfollow', function(req, res) {
    // if user is not authenticated
    if (!req.session.user) {
        res.statusCode = 403;
        var o = {message: "User is not authenticated!"};
        res.send(JSON.stringify(o));
        return;
    }

    var followed_user = req.body.followed_user;
    var following_user = req.body.following_user;

    // log
    console.log(following_user + " is going unfollow " + followed_user); 

    // get user collection
    var userlist = app.userlist;

    // 
    //
    var condition = { $or: [{username:following_user, following:followed_user}, 
                            {username:followed_user, followers:following_user}] 
                    };

    // check if current user is following the target user
    // on both tables
    userlist.findOne(condition, function(e, o) {
        if (!o) {      
            console.log("You have already unfollowed " + followed_user);
            //callback(new Error("You have already unfollowed " + followed_user), null);
            return false;
        } else {
             // update current user's list of following users
            userlist.update(    
                {username:following_user}, 
                {$pull:{following:followed_user}}, 
                {w:1}, 
                function(err, result) {
                    if (err) {
                        res.statusCode = 500;
                        var o = {message: err.message};
                        res.send(JSON.stringify(o));
                        return;
                    }
                }
            );

            // update target user's list of users followed
            userlist.update({
                username:followed_user}, 
                {$pull:{followers:following_user}}, 
                {w:1}, 
                function(err, result) {
                    if (err) {
                        res.statusCode = 500;
                        var o = {message: err.message};
                        res.send(JSON.stringify(o));
                        return;
                    }
                }
            );

            // if successful
            res.statusCode = 200;     
            var fullUrl = req.protocol + '://' + req.get('host') + '/home';                    
            var o = {message: 'unfollowed successfully!', url: fullUrl}
            res.send(JSON.stringify(o));
        }
    });    
});

// router.get('/usr/:username/unfollow', function(req, res) {
//     // TODO
//     // abandon
// });

////////////////////////////////////////////////////////////////////////////////
// User Timeline

router.get('/home', function(req, res) {

    if (req.session.user == null) {
        // if user is not logged in redirect back to login page
        res.redirect('/');
        return;
    }

    // TODO: render user timeline

    var user = req.session.user.username;
    var condition = {"username":user};    
    // first, find all followed users
    app.userlist.findOne(condition, function(e, result) {
        var cond2 = {username: {$in: result['following']}};
        // retrieve list tweets of only followed users
        app.tweetlist.find(cond2).sort( { created_at: -1 } ).toArray(function(e, list) {
            render(res, {
                title: 'TwitterClone :: Timeline',
                partial: 'home',
                username: req.session.user.username,
                fullname: req.session.user.name,
                tweets: setDisplayDate(list)
            });
        });
    });       
});

////////////////////////////////////////////////////////////////////////////////
// User Timeline
router.post('/newTweet', function(req, res) {
    // TODO: accept and save new Tweet
    //console.log("Posting a new tweet...");
    
    // if user is not authenticated
    if (!req.session.user) {
        res.statusCode = 403;
        var o = {message: "User is not authenticated!"};
        res.send(JSON.stringify(o));
        return;
    }
    
    // posting new tweeet
    // getting posted data
    var usn = req.session.user.username;
    var fn = req.session.user.name;
    var txt = req.body.text
    var time = moment().format('ddd MMM DD HH:mm:ss Z YYYY');
    
    // create inserting query
    app.tweetlist.insert (
        {   username:usn, 
            name:fn, 
            text:txt, 
            created_at:time  
        }, function (err, doc) {
            if (err) {
                res.statusCode = 500;
                var o = {message: err.message};
                res.send(JSON.stringify(o));
                return;
            }
            
            //push the tweet to Kafka server
            var payload = [{topic:'tweets', messages:txt, partition:0}];

            //app.producer.on('ready', function(){
                app.producer.send(payload, function(err, data) {
                    console.log("Pushing tweets to Kafka server..");
                    console.log(data);
                });
            //});
            app.producer.on('error', function (err) {
                console.log(err.message)
            });
            // end of pushing data to Kafka server

            
            // return                
            console.log('New tweet posted successfully!');
            var fullUrl = req.protocol + '://' + req.get('host') + '/home';
            console.log(fullUrl);
            var o = {message: 'New tweet posted successfully!', url: fullUrl}
            res.send(JSON.stringify(o));

            // res.location(fullUrl);
            // // And forward to success page
            // res.redirect(fullUrl);            
        }
    );    
});

////////////// EXPERIMENT WITH PHOTO UPLOAD TO S3 //////////////

router.get('/testphotoupload', function(req, res) {
    
    return res.render('photoupload', 
        {title: 'TwitterClone :: Test Photo UPload'}
    );   
});


router.post('/uploadphoto', function(req, res) {
    
    // Load the AWS SDK for Node.js
    var AWS = require('aws-sdk');


    AWS.config.region = 'us-west-2';

    // Create a bucket using bound parameters and put something in it.
    // Make sure to change the bucket name from "myBucket" to something unique.
    var s3bucket = new AWS.S3({params: {Bucket: 'myBucket'}});
    s3bucket.createBucket(function() {
        var params = {Key: 'myKey', Body: 'Hello!'};
        s3bucket.upload(params, function(err, data) {
            if (err) {
              console.log("Error uploading data: ", err);
            } else {
              console.log("Successfully uploaded data to myBucket/myKey");
            }
        });
    });
});



////////////////////////////////////////////////////////////////////////////////

module.exports = router;
