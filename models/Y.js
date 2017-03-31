var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Y Model
 * ==========
 */
var Y = new keystone.List('Y');

Y.add({
	name: {type: Types.Name, required: true, index: true},
	email: {type: Types.Email, initial: true, required: true, unique: true, index: true},
	password: {type: Types.Password, initial: true, required: true},
}, 'Permissions', {
	isAdmin: {type: Boolean, label: 'Can access Keystone', index: true},
});

// Provide access to Keystone
Y.schema.virtual('canAccessKeystone').get(function () {
	return this.isAdmin;
});


/**
 * Registration
 */
Y.defaultColumns = 'name, email, isAdmin';
Y.register();

Y.schema.methods.comparePassword = function (candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.encrypted_password, function (err, isMatch) {
		if (err) return cb(err);
		cb(null, isMatch);
	});
};
