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
const math = require('handlebars-helpers')(['math']);
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
<<<<<<< HEAD
app.get('/class/:classId/section/:sectId/rubric', rubricControllers.loadAll);

// Create new rubric
app.post('/class/:classId/section/:sectId/rubric/create', (req, res) => {
    rubricControllers.createRubric(req, res);
=======
app.get('/class/:classId/section/:sectId/rubric', (req, res) => {
    const assignmentDate = req.query.date;
    const assignmentTitle = req.query.title;
    const sectId = req.params.sectId;
    const classId = req.params.classId;
    Classes.findOne({ _id: classId }, (err, resultClass) => {
        Sections.findOne({ _id: sectId }, (err, resultSection) => {
            Rubrics.find({sectionId: {$elemMatch: {$eq: sectId}}, isMaster: true}, (err1, rubrics) => {
                // console.log(rubrics);
                res.render('rubric', {errors, resultClass, resultSection, rubrics, date: assignmentDate, title: assignmentTitle, data: fieldData});
                errors = [];
                fieldData = [""];
            });
        });
    });
});

// Create new rubric
app.post('/class/:classId/section/:sectId/rubric/create', (req, res) => {
    const date = req.body.date;
    const title = req.body.title;
    const classId = req.params.classId;
    const sectId = req.params.sectId;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    const fieldCriteria = req.body.fieldCriteria;
    const radio = req.body.scope;
    for(var i  = 0; i < fieldData.length; i++){
        if(fieldNames[i] === "" || fieldValues[i] === ""){
            errors.push("Please fill out all Field Names and Max Points");
            break;
        }
    }
    if(date === "" || title === ""){
        errors.push("Please fill out Assignment Date and Name");
    }
    if (title.length < 1 || title.length > 50) {
        errors.push('Assignment name must be between 1-50 characters.');
    }
    if (errors.length === 0) {
        const newRubric = new Rubrics({
            classId: classId,
            assignmentDate: date,
            assignmentTitle: title,
            isMaster: true,
        });
        if(radio === "thisSection") {
            newRubric.sectionId.push(sectId);
            for(var i = 0; i < fieldNames.length; i++){
                let criteriaStrings = fieldCriteria[i].trim().split(',');
                //console.log(criteriaStrings);
                let criteria = [];
                for(var j = 0; j < criteriaStrings.length; j++) {
                    criteria.push([criteriaStrings[j], 0 ]);
                }
                newRubric.fields.push({title: fieldNames[i], pointsPossible: fieldValues[i], description: fieldDescriptions[i], criteria});
            }
            newRubric.save(() => {
                console.log(`Saved ${newRubric}`);
                fieldData = [""];
                res.redirect(`/class/${classId}/section/${sectId}/rubric`);
            });
        } else {
            Sections.find({ classId: classId }, (err, sects) => {
                for(var i = 0; i < sects.length; i++) {
                    newRubric.sectionId.push(sects[i]._id);
                }
                for(var i = 0; i < fieldNames.length; i++){
                    let criteriaStrings = fieldCriteria[i].trim().split(',');
                    //console.log(criteriaStrings);
                    let criteria = [];
                    for(var j = 0; j < criteriaStrings.length; j++) {
                        criteria.push([criteriaStrings[j], 0 ]);
                    }
                    newRubric.fields.push({title: fieldNames[i], pointsPossible: fieldValues[i], description: fieldDescriptions[i], criteria});
                }
                newRubric.save(() => {
                    console.log(`Saved ${newRubric}`);
                    fieldData = [""];
                    res.redirect(`/class/${classId}/section/${sectId}/rubric`);
                });
            });
        }
    } else {
        fieldData = [];
        for(var i = 0; i < fieldNames.length; i++){
            let criteriaStrings = fieldCriteria[i].trim().split(',');
            let criteria = [];
            for(var j = 0; j < criteriaStrings.length; j++) {
                criteria.push([criteriaStrings[j], 0 ]);
            }
            fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i], criteria});
        }
        res.redirect("/class/"+classId+"/section/"+sectId+"/rubric?date="+date+"&title="+title);
    }
>>>>>>> e2ae2c9ec811ec3c2014cd5ff55bebb33cc620a7
});

//delete rubric from list
app.get('/class/:classId/section/:sectId/rubric/:rubricId/delete', rubricControllers.deleteRubric);

// clone rubric
app.get('/class/:classId/section/:sectId/rubric/:rubricId/clone', rubricControllers.cloneRubric);

//add a field to rubric
app.post('/class/:classId/section/:sectId/rubric/addField', (req, res)=>{
<<<<<<< HEAD
    rubricControllers.addField(req, res);
=======
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    const fieldCriteria = req.body.fieldCriteria;
    fieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        let criteria = fieldCriteria[i].trim().split(',');
        fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i], criteria});
    }
    fieldData.push("");
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric?date='+date+'&title='+title);
>>>>>>> e2ae2c9ec811ec3c2014cd5ff55bebb33cc620a7
});

//remove last field from rubric
app.post('/class/:classId/section/:sectId/rubric/removeField', (req, res)=>{
<<<<<<< HEAD
    rubricControllers.removeField(req, res);
});
var fieldChanged = 0;
app.set('fieldChanged', fieldChanged);
// Edit rubric
app.get('/class/:classId/section/:sectId/rubric/:rubricId/edit', rubricControllers.editRubric);

//add a field to rubric during edit
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit/addField', (req, res)=>{
   rubricControllers.editAddField(req, res);
=======
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    const fieldCriteria = req.body.fieldCriteria;
    fieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        let criteria = fieldCriteria[i].trim().split(',');
        fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i], criteria});
    }
    if(fieldData.length > 1){
        fieldData.pop();
    }
    else{
        errors.push("Cannot remove last remaining field");
    }
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric?date='+date+'&title='+title);
});
var fieldChanged = 0;

// Edit rubric
app.get('/class/:classId/section/:sectId/rubric/:rubricId/edit', (req, res) => {
    const id = req.params.rubricId;
    var assignmentDate = req.query.date;
    Rubrics.findOne({ _id: id }, (err, rubric) => {
        console.log(rubric);
        if(!fieldChanged){
            editFieldData = [];
            for(var i = 0; i < rubric.fields.length; i++){
                let criteriaChunks = rubric.fields[i].criteria;
                let criteria = [];
                for(var j = 0; j < criteriaChunks.length; j++) {
                    criteria.push(criteriaChunks[j][0]);
                }
                editFieldData.push({title: rubric.fields[i].title, description: rubric.fields[i].description, pointsPossible: rubric.fields[i].pointsPossible, criteria});
            }
        }
        else{
            fieldChanged = 0;
        }
        var d = new Date(rubric.assignmentDate),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = '' + d.getFullYear();

        if (month.length < 2){ month = '0' + month;}
        if (day.length < 2){ day = '0' + day;}
        if (year.length < 4){
            var zero = "";
            for(var i = 0; i < 4 - year.length; i++){
                zero += '0';
            }
            year = zero + year;
        }
        var stringDate = [year, month, day].join('-')
        console.log("date from rubric", stringDate);
        if(!assignmentDate){assignmentDate = stringDate;}
        
        res.render('editing', { rubric, classID: req.params.classId, date: assignmentDate, sectionID: req.params.sectId, data: editFieldData, errors });
        editFieldData = [];
        errors = [];
    });
});

//add a field to rubric during edit
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit/addField', (req, res)=>{
    const date = req.body.date;
    const fieldNames = req.body.fieldName;
    const fieldValues = req.body.fieldPts;
    const fieldDescriptions = req.body.fieldDesc;
    const fieldCriteria = req.body.fieldCriteria;
    editFieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        let criteriaStrings = fieldCriteria[i].trim().split(',');
        let criteria = [];
        for(var j = 0; j < criteriaStrings.length; j++) {
            criteria.push([criteriaStrings[j], 0]);
        }
        editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i], criteria});
    }
    editFieldData.push("");
    fieldChanged = 1;
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric/'+req.params.rubricId+'/edit?date='+date);
>>>>>>> e2ae2c9ec811ec3c2014cd5ff55bebb33cc620a7
});

//remove last field from rubric during edit
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit/removeField', (req, res)=>{
<<<<<<< HEAD
    rubricControllers.editRemoveField(req, res);
=======
    const date = req.body.date;
    const fieldNames = req.body.fieldName;
    const fieldValues = req.body.fieldPts;
    const fieldDescriptions = req.body.fieldDesc;
    const fieldCriteria = req.body.fieldCriteria;
    editFieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        let criteriaStrings = fieldCriteria[i].trim().split(',');
        let criteria = [];
        for(var j = 0; j < criteriaStrings.length; j++) {
            criteria.push([criteriaStrings[j], 0 ]);
        }
        editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i], criteria});
    }
    if(editFieldData.length > 1){
        editFieldData.pop();
        fieldChanged = 1;
    }
    else{
        errors.push("Cannot remove last remaining field");
    }
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric/'+req.params.rubricId+'/edit?date='+date);
>>>>>>> e2ae2c9ec811ec3c2014cd5ff55bebb33cc620a7
});

// Update edits
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit', (req, res) => {
<<<<<<< HEAD
    rubricControllers.updateEdits(req, res);
=======
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldName;
    const fieldDescriptions = req.body.fieldDesc;
    const fieldValues = req.body.fieldPts;
    const fieldCriteria = req.body.fieldCriteria;
    for(var i  = 0; i < fieldNames.length; i++){
        if(fieldNames[i] == "" || fieldValues[i] == ""){
            errors.push("Please fill out all Field Names and Max Points");
            break;
        }
    }
    if(date === "" || title === ""){
        errors.push("Please fill out Assignment Date and Name");
    }
    if (title.length < 1 || title.length > 50) {
        errors.push('Assignment name must be between 1-50 characters.');
    }
    if(errors.length === 0){
        Rubrics.findOne({ _id: req.params.rubricId, isMaster: true }, (err, rubric) => {
            editFieldData = [];
            for(var i = 0; i < fieldNames.length; i++){
                let criteriaStrings = fieldCriteria[i].trim().split(',');
            let criteria = [];
            for(var j = 0; j < criteriaStrings.length; j++) {
                criteria.push([criteriaStrings[j], 0 ]);
            }
                editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i], criteria});
            }
            Rubrics.update({ _id: req.params.rubricId }, { $set: { assignmentDate: date, assignmentTitle: title, fields: editFieldData }}, () => {
                Rubrics.remove({masterId: req.params.rubricId}, () =>{
                    editFieldData = [];
                    res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric`);
                })
            });
        });
    }
    else{
        editFieldData = [];
        for(var i = 0; i < fieldNames.length; i++){
            let criteriaStrings = fieldCriteria[i].trim().split(',');
            let criteria = [];
            for(var j = 0; j < criteriaStrings.length; j++) {
                criteria.push([criteriaStrings[j], 0 ]);
            }
            editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i], criteria});
        }
        fieldChanged = 1;
        res.redirect("/class/"+req.params.classId+"/section/"+req.params.sectId+"/rubric/"+req.params.rubricId+"/edit?date="+date);
    }
>>>>>>> e2ae2c9ec811ec3c2014cd5ff55bebb33cc620a7
});

//view rubrics and students
app.get('/class/:classId/section/:sectId/rubric/:rubricId/fillOut', rubricControllers.fillOut);

//fill out rubric for specific student
<<<<<<< HEAD
app.get('/class/:classId/section/:sectId/rubric/:rubricId/fillOut/:studentId', rubricControllers.fillOutStudent);

//submit filled out rubric
app.post('/class/:classId/section/:sectId/rubric/:rubricId/fillOut/:studentId/submit', (req, res) => {
    rubricControllers.submitRubric(req, res);
=======
app.get('/class/:classId/section/:sectId/rubric/:rubricId/fillOut/:studentId', (req, res) => {
    var CID = req.params.classId;
    var SID = req.params.sectId;
    var RID = req.params.rubricId;
    var stud = req.params.studentId;
    Rubrics.findOne({_id: RID}, (err, rubric) => {
        Students.find({sections: {$elemMatch: {$eq: SID}}}).collation({locale: "en", strength: 2}).sort({lastname: 1, firstname: 1}).exec(function (err, students) {
            Students.findOne({_id: stud}, (err, student) => {
                Rubrics.findOne({studentId: stud, masterId: RID}, (err, studentRubric) => {
                    //console.log(rubric.fields[0].criteria);
                    res.render('fillOut', {rubric, students, classId: CID, sectionId: SID, rubricId: RID, student, studentRubric});
                });
            });
        });
    });
});

//submit filled out rubric
app.post('/class/:classId/section/:sectId/rubric/:rubricId/fillOut/:studentId/submit', (req, res) => {
    var CID = req.params.classId;
    var SID = req.params.sectId;
    var RID = req.params.rubricId;
    var points = req.body.pointsEarned;
    var studId = req.params.studentId;
    var cmnts = req.body.comments;
    var slider = req.body.sliderScore;
    console.log(`slider: ${slider}`);
    for(var i = 0; i < points.length; i++){
        if(points[i] === ""){
            points[i] = 0;
        }
    }
    Rubrics.findOne({studentId: studId, masterId: RID}, (err, studentRubric) => {
        if(studentRubric){
            let sliderCounter = 0;
            for(var i = 0; i < studentRubric.fields.length; i++){
                let totalPts = 0;
                for(var j = 0; j < studentRubric.fields[i].criteria.length; j++) {
                    studentRubric.fields[i].criteria[j][1] = slider[sliderCounter];
                    totalPts += parseInt(slider[sliderCounter]);
                    // console.log(`slider[sliderCounter] = ${slider[sliderCounter]}`);
                    sliderCounter++;
                }
                // studentRubric.fields[i].pointsEarned = points[i];
                studentRubric.fields[i].pointsEarned = totalPts;
            }
            Rubrics.update({studentId: studId, masterId: RID}, {$set: {fields: studentRubric.fields, comments: cmnts}}, () => {
                res.redirect(`/class/${CID}/section/${SID}/rubric/${RID}/fillOut`);
            });
        }
        else{
            Rubrics.findOne({_id: RID}, (err, rubric) => {
                var newRubric = new Rubrics({
                    classId: CID,
                    studentId: studId,
                    comments: cmnts,
                    assignmentDate: rubric.assignmentDate,
                    assignmentTitle: rubric.assignmentTitle,
                    isMaster: false,
                    masterId: RID,
                });
                newRubric.sectionId.push(SID);
                let sliderCounter = 0;
                for(var i = 0; i < rubric.fields.length; i++){
                    let totalPts = 0;
                    for(var j = 0; j < rubric.fields[i].criteria.length; j++) {
                        rubric.fields[i].criteria[j][1] = slider[sliderCounter];
                        totalPts += parseInt(slider[sliderCounter]);
                        // console.log(`slider[sliderCounter] = ${slider[sliderCounter]}`);
                        sliderCounter++;
                    }
                    newRubric.fields.push({title: rubric.fields[i].title,
                        pointsPossible: rubric.fields[i].pointsPossible,
                        pointsEarned: totalPts,
                        description: rubric.fields[i].description,
                        criteria: rubric.fields[i].criteria,
                    });
                }
                newRubric.save(() => {
                    console.log(`Saved ${newRubric}`);
                    res.redirect(`/class/${CID}/section/${SID}/rubric/${RID}/fillOut`);
                });
            });
        }
    })
>>>>>>> e2ae2c9ec811ec3c2014cd5ff55bebb33cc620a7
});

// Display list of students with their scores
app.get('/class/:classId/section/:sectId/rubric/:rubricId/viewScores', rubricControllers.displayScores);

// Start the server
const port = process.env.PORT || 3500;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});