var crypto 		= require('crypto');
var moment 		= require('moment');

/* login validation methods */

exports.autoLogin = function(user, pass, accounts, callback)
{
	accounts.findOne({username:user}, function(e, o) {
		if (o){
			o.pass == pass ? callback(o) : callback(null);
		}	else{
			callback(null);
		}
	});
}

exports.manualLogin = function(user, pass, accounts, callback)
{
	// look up for provided username
	accounts.findOne({username:user}, function(e, o) {
		//console.log('validating username & password..');
		if (o == null || e) {
			//console.log('validating username & password..');
			console.log("Username not found!");
			return callback(new Error('Username not found!'), null);
			//callback('user-not-found');
		}	
		else { // if username found, check for password			
			if (pass == o.password) { // if ok..
				console.log("AUTHENTICATED");
				callback(null, o);
			}
			else { // otherwise, say something
				console.log("Invalid password!");
				return callback(new Error('Invalid password!'), null);
			}
		}
	});
}

/* record insertion, update & deletion methods */

exports.addNewAccount = function(newData, accounts, callback)
{
	accounts.findOne({username:newData.username}, function(e, o) {
		if (o){
			callback('username-taken');
		}
		else{
			// NOTE: This creates an account where the password is the username
			// to simplify things, i just use plaintext for the password
			// which is composed from username + a string "123"
			newData.password = newData.username + "123";
			newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
			accounts.insert(newData, {safe: true}, callback);
			console.log(newData.username + " added!");
		}
	});
}


/////////// TWEET MANAGEMENT AREA /////////
exports.populateTweets = function(newData, tweets, callback)
{
	tweets.insert(newData, {safe: true}, callback);
	return;
	//console.log(newData. + " added!");	
}


/* private encryption & validation methods */

var generateSalt = function()
{
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var md5 = function(str) {
	return crypto.createHash('md5').update(str).digest('hex');
}

var saltAndHash = function(pass, callback)
{
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback)
{
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
}
