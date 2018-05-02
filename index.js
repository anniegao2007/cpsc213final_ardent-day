'use strict';

const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const validator = require('validator');
const handlebars = require('handlebars');
const handlebarsintl = require('handlebars-intl');
handlebarsintl.registerWith(handlebars);
const ss = require('simple-statistics');
const app = express();
mongoose.connect(process.env.MONGO_URL);
const plotly = require('plotly')("ardent-day", "mpWDqBKdKQDkPalrCoeN");

const classModels = require('./models/classes.js');
const sectionModels = require('./models/sections.js');
const userModels = require('./models/users.js');
const studentModels = require('./models/students.js');
const rubricModels = require('./models/rubrics.js');

const Classes = classModels.Classes;
const Sections = sectionModels.Sections;
const Users = userModels.Users;
const Students = studentModels.Students;
const Rubrics = rubricModels.Rubrics;

const userControllers = require('./controllers/users.js');
const classControllers = require('./controllers/classes.js');
const sectionControllers = require('./controllers/sections.js');
const studentControllers = require('./controllers/students.js');
const rubricControllers = require('./controllers/rubrics.js');

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
app.set('errors', errors);

// home page or classes list
app.get('/', classControllers.loadAll);

// user login
app.post('/user/login', (req, res) => {
    userControllers.login(req, res);
});

// user logout
app.get('/user/logout', userControllers.logout);

// new user registration
app.post('/user/register', (req, res) => {
    userControllers.register(req,res);
});

//  All the controllers and routes below this require
//  the user to be logged in.
app.use(isLoggedIn);

// create new class
app.post('/class/create', (req, res) => {
   classControllers.create(req, res);
});

// Edit class information
app.get('/class/:id/edit', classControllers.edit);

// Update edits
app.post('/class/:id/edit', (req, res) => {
    classControllers.updateEdits(req, res);
});

// Delete class
app.get('/class/:id/delete', classControllers.deleteClass);

// Load all sections in a class
app.get('/class/:id/section', sectionControllers.loadAll);

//create section
app.post('/class/:id/section/create', (req, res) => {
    sectionControllers.createSection(req, res);
});

// Delete section
app.get('/class/:classId/section/:id/delete', sectionControllers.deleteSection);

// Edit section
app.get('/class/:classId/section/:sectId/edit', sectionControllers.editSection);

// Update edits
app.post('/class/:classId/section/:sectId/edit', (req, res) => {
    sectionControllers.updateEdits(req, res);
});

// List all students in a section
app.get('/class/:classId/section/:id/student', studentControllers.loadAll);

// Add student to a section
app.post('/class/:classId/section/:sectionId/student/create', (req, res) => {
    studentControllers.createStudent(req, res);
});

// Edit a student's data
app.get('/class/:classId/section/:sectionId/student/:studentId/edit', studentControllers.editStudent);

// Update edits
app.post('/class/:classId/section/:sectionId/student/:studentId/edit', (req, res) => {
   studentControllers.updateEdits(req, res);
});

// Delete a student from a section
app.get('/class/:classId/section/:sectionId/student/:studentId/delete', studentControllers.deleteStudent);

var fieldData = [""];
var editFieldData = [];
app.set('fieldData', fieldData);
app.set('editFieldData', editFieldData);

// Load all rubrics in a class
app.get('/class/:classId/section/:sectId/rubric', rubricControllers.loadAll);

// Create new rubric
app.post('/class/:classId/section/:sectId/rubric/create', (req, res) => {
    rubricControllers.createRubric(req, res);
});

//delete rubric from list
app.get('/class/:classId/section/:sectId/rubric/:rubricId/delete', rubricControllers.deleteRubric);

// clone rubric
app.get('/class/:classId/section/:sectId/rubric/:rubricId/clone', rubricControllers.cloneRubric);

//add a field to rubric
app.post('/class/:classId/section/:sectId/rubric/addField', (req, res)=>{
    rubricControllers.addField(req, res);
});

//remove last field from rubric
app.post('/class/:classId/section/:sectId/rubric/removeField', (req, res)=>{
    rubricControllers.removeField(req, res);
});
var fieldChanged = 0;
app.set('fieldChanged', fieldChanged);
// Edit rubric
app.get('/class/:classId/section/:sectId/rubric/:rubricId/edit', rubricControllers.editRubric);

//add a field to rubric during edit
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit/addField', (req, res)=>{
   rubricControllers.editAddField(req, res);
});

//remove last field from rubric during edit
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit/removeField', (req, res)=>{
    rubricControllers.editRemoveField(req, res);
});

// Update edits
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit', (req, res) => {
    rubricControllers.updateEdits(req, res);
});

//view rubrics and students
app.get('/class/:classId/section/:sectId/rubric/:rubricId/fillOut', rubricControllers.fillOut);

//fill out rubric for specific student
app.get('/class/:classId/section/:sectId/rubric/:rubricId/fillOut/:studentId', rubricControllers.fillOutStudent);

//submit filled out rubric
app.post('/class/:classId/section/:sectId/rubric/:rubricId/fillOut/:studentId/submit', (req, res) => {
    rubricControllers.submitRubric(req, res);
});

// Display list of students with their scores
app.get('/class/:classId/section/:sectId/rubric/:rubricId/viewScores', rubricControllers.displayScores);

// Start the server
const port = process.env.PORT || 3500;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});