'use strict';

const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const validator = require('validator');
const app = express();
mongoose.connect(process.env.MONGO_URL);

const Users = require('./models/users.js');
const Classes = require('./models/classes.js');
const Students = require('./models/students.js');
const Rubrics = require('./models/rubrics.js');

const store = new MongoDBStore({
    uri: process.env.MONGO_URL,
    collection: 'sessions',
});

app.engine('handlebars', exphbs({
    defaultLayout: 'main',
}));
app.set('view engine', 'handlebars');
app.use('/static', express.static('static'));

app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json());

// Configure session middleware that will parse the cookies
// of an incoming request to see if there is a session for this cookie.
app.use(session({
    secret: process.env.SESSION_SECRET || 'super secret session',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: 'auto',
    },
    store,
}));

// Middleware that looks up the current user for this sesssion, if there
// is one.
app.use((req, res, next) => {
    if (req.session.userId) {
        Users.findById(req.session.userId, (err, user) => {
            if (!err) {
                res.locals.currentUser = user;
            }
            next();
        });
    } else {
        next();
    }
});

/**
 * Middleware that checks if a user is logged in.
 * If so, the request continues to be processed, otherwise a
 * 403 is returned.
 * @param  {Request} req - The request
 * @param  {Response} res - sdf
 * @param  {Function} next - sdfs
 * @returns {undefined}
 */
function isLoggedIn(req, res, next) {
    if (res.locals.currentUser) {
        next();
    } else {
        res.sendStatus(403);
    }
}

let errors = [];

// home page
app.get('/', (req, res) => {
    if (req.session.userId) {
        Users.findOne({ _id: req.session.userId }, (err, user) => {
            Classes.find({ instructors: user.email }, (err1, classes) => {
                res.render('index', { classes, errors });
                errors = [];
            });
        });
    } else {
        res.render('index', { errors });
        errors = [];
    }
});

// user login
app.post('/user/login', (req, res) => {
    const userEmail = req.body.email;
    const pass = req.body.password;

    Users.findOne({ email: userEmail }, (err, user) => {
        if (user) {
            user.comparePassword(pass, (err2, isMatch) => {
                if (isMatch) {
                    req.session.userId = user._id;
                    res.redirect('/');
                } else {
                    errors.push('Wrong password.');
                    res.redirect('/');
                }
            });
        } else {
            errors.push('User does not exist.');
            res.redirect('/');
        }
    });
});

// user logout
app.get('/user/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// new user registration
app.post('/user/register', (req, res) => {
    const userName = req.body.name;
    const userEmail = req.body.email;
    const pass = req.body.password;
    const passConfirm = req.body.passwordConfirmation;

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
        res.render('index', { errors });
        errors = [];
    } else {
        Users.findOne({ email: userEmail }, (err, user) => {
            if (user) {
                errors.push('Account with this email already exists.');
                res.render('index', { errors });
                errors = [];
            } else {
                const user1 = new Users({
                    email: userEmail, name: userName, hashed_password: pass,
                });
                user1.save(() => {
                    console.log(`Saved: ${user1}`);
                    req.session.userId = user1._id;
                    res.redirect('/');
                });
            }
        });
    }
});

//  All the controllers and routes below this require
//  the user to be logged in.
app.use(isLoggedIn);

// create new class -- consider redirecting to a whole
// new page for adding students and stuff
app.post('/class/create', (req, res) => {
    const className = req.body.className;
    const newInstructor = req.body.newInstructor;

    const regex = /.+@.+\..+/;

    if (className.length < 1 || className.length > 50) {
        errors.push('Class name must be between 1-50 characters.');
    }
    if (newInstructor.length !== 0) {
        if (!regex.test(newInstructor)) {
            errors.push('Invalid instructor email.');
        }
    }

    Classes.findOne({ name: className }, (err1, result) => {
        if (result) {
            errors.push('Class already exists.');
        }
        if (errors.length === 0) {
            Users.findOne({ _id: req.session.userId }, (err, user) => {
                const newClass = new Classes({
                    instructors: [user.email, newInstructor],
                    name: className,
                });
                newClass.save(() => {
                    console.log(`Saved ${newClass}`);
                    res.redirect('/');
                });
            });
        } else {
            res.redirect('/');
        }
    });
});

// Load all rubrics in a class
app.get('/class/:id/rubrics', (req, res) => {
    const id = req.params.id;
    Classes.findOne({ _id: id }, (err, resultClass) => {
        Rubrics.find({ classId: id }, (err1, rubrics) => {
            res.render('class', { resultClass, rubrics, errors });
        });
    });
});

// Create new rubric
app.post('/rubric/:classId/create', (req, res) => {
    const date = req.body.date;
    const title = req.body.title;
    const classId = req.params.classId;

    if (title.length < 1 || title.length > 50) {
        errors.push('Assignment name must be between 1-50 characters.');
    }
    if (errors.length === 0) {
        const newRubric = new Rubrics({
            classId,
            assignmentDate: date,
            assignmentTitle: title,
        });
        console.log(title);
        newRubric.save(() => {
            console.log(`Saved ${newRubric}`);
            res.redirect(`/class/${classId}/rubrics`);
        });
    } else {
        res.redirect(`/class/${classId}/rubrics`);
    }
});

// Add actual items into rubric: item, optional description, point value
app.get('/rubric/:rubricid/edit', (req, res) => {

});

// List sections of that class
app.get('/rubric/:rubricid/sections', (req, res) => {

});

// Start the server
const port = process.env.PORT || 3500;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
