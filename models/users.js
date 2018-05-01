const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_WORK_FACTOR = 10;

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 50,
};

const UserSchema = new Schema({
    email: {
        type: String,
        minlength: 1,
        maxlength: 50,
        lowercase: true,
        unique: true,
    },
    name: stringField,
    hashed_password: stringField,
});

UserSchema.pre('save', function userPreHook(next) {
    const user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('hashed_password')) return next();

    // generate a salt
    return bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
        if (err) return next(err);

        // hash the password using our new salt
        return bcrypt.hash(user.hashed_password, salt, (err2, hash) => {
            if (err2) return next(err2);

            // override the cleartext password with the hashed one
            user.hashed_password = hash;
            return next();
        });
    });
});

UserSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.hashed_password, (err, isMatch) => {
        // console.log('isMatch = ', isMatch);
        if (err) return cb(err);
        return cb(null, isMatch);
    });
};

UserSchema.statics.count = cb => this.model('Users')
    .find({}, cb);

async function login(req, res, Users){
    return new Promise((resolve, reject) => {
        const userEmail = req.body.email;
        const pass = req.body.password;

        var errors = req.app.get('errors');
        
        Users.findOne({ email: userEmail }, (err, user) => {
            if (user) {
                user.comparePassword(pass, (err2, isMatch) => {
                    if (isMatch) {
                        req.session.userId = user._id;
                        resolve();
                    } else {
                        errors.push('Wrong password.');
                        resolve();
                    }
                });
            } else {
                errors.push('User does not exist.');
                resolve();
            }
        });
    });
}

async function logout(req, res){
    return new Promise((resolve, reject) => {
        req.session.destroy();
        resolve();
    });
}

async function register(req, res, Users){
    return new Promise((resolve, reject) => {
        const userName = req.body.name;
        const userEmail = req.body.email;
        const pass = req.body.password;
        const passConfirm = req.body.passwordConfirmation;

        var errors = req.app.get('errors');

        const regex = /.+@.+\..+/;

        if (pass !== passConfirm) {
            errors.push('Passwords do not match.');
        }
        if (!regex.test(userEmail)) {
            errors.push('Email not valid.');
        }
        if (userName.length > 50 || userName.length < 1) {
            errors.push('Invalid length for name.');
        }
        if (pass.length > 50 || pass.length < 1) {
            errors.push('Invalid length for password.');
        }
        if (userEmail.length > 50 || userEmail.length < 1) {
            errors.push('Invalid email length.');
        }

        if (errors.length > 0) {
            resolve();
        } else {
            Users.findOne({ email: userEmail }, (err, user) => {
                if (user) {
                    errors.push('Account with this email already exists.');
                    resolve();
                } else {
                    const user1 = new Users({
                        email: userEmail, name: userName, hashed_password: pass,
                    });
                    user1.save(() => {
                        console.log(`Saved: ${user1}`);
                        req.session.userId = user1._id;
                        resolve();
                    });
                }
            });
        }
    });
}

module.exports = {
    Users: mongoose.model('Users', UserSchema),
    login,
    logout,
    register,
}
