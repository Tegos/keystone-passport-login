var keystone = require('keystone');
var middleware = require('./middleware');
var importRoutes = keystone.importer(__dirname);

var LocalStrategy = require("passport-local").Strategy;

var FacebookStrategy = require('passport-facebook').Strategy;

var FaceBookSetting = {
	clientID: 180697565778269,
	clientSecret: '498f3e57a48616fac08b22b9c6417ab7'
};

var passport = require('passport');

var userModel = keystone.list('Y').model;


passport.serializeUser(function (user, done) {
	//console.log(user);
	done(null, user);
});

passport.deserializeUser(function (user_data, done) {
	console.log('des');
	console.log(user_data);
	done(null, user_data);
	// userModel.findOne({email: user_data.email}, function (err, user) {
	// 	done(err, user);
	// });
});


passport.use(new LocalStrategy(
	{
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true // with req
	},
	function (req, email, password, done) {
		//console.log('username');
		//console.log(email);

		process.nextTick(function () {

			userModel.findOne({email: email}).exec(function (err, user) {
				if (user) {
					user._.password.compare(password, function (err, isMatch) {
						if (!err && isMatch) {
							req.user = user;
							return done(null, user);

						}
						else {
							return done(null, false);
						}
					});
				} else {
					return done(null, false);
				}
			});

		});
	}
));

// Facebook 
passport.use(new FacebookStrategy({
		clientID: FaceBookSetting.clientID,
		clientSecret: FaceBookSetting.clientSecret,
		callbackURL: "http://localhost:3000/auth/facebook/callback",
		profileFields: ['id', 'displayName', 'link', 'email', 'first_name', 'last_name']
	},
	function (accessToken, refreshToken, profile, done) {
		process.nextTick(function () {

			console.log(profile);
			var email = profile.emails[0].value;
			userModel.findOne({email: email}).exec(function (err, oldUser) {
				if (oldUser) {
					done(null, oldUser);
				} else {
					var insertData = {
						name: {first: profile.name.familyName, last: profile.name.givenName},
						password: profile.id + '',
						email: email,
						isAdmin: false
					};

					console.log(insertData);

					var newUser = new userModel(insertData).save(function (err, newUser) {
						if (err) throw err;
						done(null, newUser);
					});
				}
			});

		});
	}
));


// Common Middleware
keystone.pre('routes', middleware.initLocals);
keystone.pre("routes", passport.initialize());

keystone.pre('render', middleware.flashMessages);

keystone.pre("routes", passport.session());

// fill isLogged
keystone.pre("routes", function (req, res, next) {
	res.locals.isLogged = !(!req.isAuthenticated || !req.isAuthenticated());
	next();
});

// Import Route Controllers
var routes = {
	views: importRoutes('./views')
};

/*
 * Check the request if the user is authenticated.
 * Return an error message if not, otherwise keep going :)
 */
function ensureLoggedIn() {
	return function (req, res, next) {
		// isAuthenticated is set by `deserializeUser()`
		if (!req.isAuthenticated || !req.isAuthenticated()) {
			res.status(401).send({
				success: false,
				message: 'You need to be authenticated to access this page!'
			})
		} else {
			next()
		}
	}
}


// Setup Route Bindings
exports = module.exports = function (app) {
	// Views
	app.get('/', routes.views.index);
	app.get('/gallery', routes.views.gallery);
	app.all('/contact', routes.views.contact);


	app.post('/login',
		passport.authenticate('local', {
			successRedirect: '/loginSuccess',
			failureRedirect: '/loginFailure',
			failureFlash: true
		}));

	// facebook auth
	app.get("/auth/facebook", passport.authenticate('facebook', {scope: ['email']}));

	app.get("/auth/facebook/callback",
		passport.authenticate("facebook",
			{
				successRedirect: '/loginSuccess',
				failureRedirect: '/loginFailure',
				failureFlash: true
			})
		// function (req, res) {
		// 	res.render("loggedin", {user: req.user});
		// }
	);

	app.get('/loginFailure', function (req, res, next) {
		res.send('Failure to authenticate');
	});

	app.get('/loginSuccess', function (req, res, next) {
		res.send('Successfully authenticated');
	});

	app.get('/check', ensureLoggedIn(), function (req, res, next) {
		res.send({success: true, message: 'You are authenticated'});
	});

};
