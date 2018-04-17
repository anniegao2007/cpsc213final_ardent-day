'use strict';

const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const validator = require('validator');
const handlebarsintl = require('handlebars-intl');
const app = express();
mongoose.connect(process.env.MONGO_URL);

const Users = require('./models/users.js');
const Classes = require('./models/classes.js');
const Rubrics = require('./models/rubrics.js');
const Sections = require('./models/sections.js');
const Students = require('./models/students.js');

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

// home page or classes list
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
    let instructors = req.body.instructors.trim().split(',');
    const regex = /.+@.+\..+/;

    if (className.length < 1 || className.length > 50) {
        errors.push('Class name must be between 1-50 characters.');
    }
    if (instructors.length > 0) {
        for(var i = 0; i < instructors.length; i++) {
            if (!regex.test(instructors[i])) {
                errors.push('At least one instructor email is invalid.');
                break;
            }
        }
    }

    Classes.findOne({ name: className }, (err1, result) => {
        /* if (result) {
            errors.push('Class already exists.');
        } */ //no restrictions on overlapping class names
        if (errors.length === 0) {
            Users.findOne({ _id: req.session.userId }, (err, user) => {
                instructors.push(user.email);
                const newClass = new Classes({
                    instructors: instructors,
                    name: className,
                    // sectionIds: [],
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

// Edit class information
app.get('/class/:id/edit', (req, res) => {
    const classId = req.params.id;
    Classes.findOne({ _id: classId }, (err, c) => {
        res.render('editing', { class: c });
    });
});

// Update edits
app.post('/class/:id/edit', (req, res) => {
    const newName = req.body.classname;
    const instructors = req.body.instructors.trim().split(',');
    console.log(instructors);
    Classes.update({ _id: req.params.id }, { $set: { name: newName, instructors }}, () => {
        res.redirect('/');
    });
});

// Load all sections in a class
app.get('/class/:id/section', (req, res) => {
    const id = req.params.id;
    Classes.findOne({ _id: id }, (err, resultClass) => {
        Sections.find({ classId: id }, (err1, sections) => {
            res.render('sections', { resultClass, sections, errors });
            errors = [];
        });
    });
});

//create section
app.post('/class/:id/section/create', (req, res) => {
    const classId = req.params.id;
    const sectionName = req.body.name;
    const instructorEmail = req.body.instructor;

    Users.findOne({ email: instructorEmail }, (err, user) => {
        if(user) {
            const newSection = new Sections({
                instructor: user.name,
                instructorId: user._id,
                name: sectionName,
                classId: classId,
            });
            newSection.save(() => {
                res.redirect(`/class/${classId}/section`);
            });
        } else {
            errors.push("Instructor not registered in database.");
            res.redirect(`/class/${classId}/section`);
        }
    })
});

// Delete section
app.post('/class/:classId/section/:id/delete', (req, res) => {
    const sectionId = req.params.id;
    const classId = req.params.classId;
    Sections.findOne({ _id: sectionId }, (err, resultClass) => {
        Sections.remove(resultClass, () => {
            res.redirect(`/class/${classId}/section`);
        });
    });
});

// Edit section
app.get('/class/:classId/section/:sectId/edit', (req, res) => {
    const classId = req.params.classId;
    const sectId = req.params.sectId;
    Sections.findOne({ _id: sectId }, (err, sect) => {
        Users.findOne({ _id: sect.instructorId }, (err, user) => {
            res.render('editing', { section: sect, classID: classId, instructorEmail: user.email});
        });
    });
});

// Update edits
app.post('/class/:classId/section/:sectId/edit', (req, res) => {
    const classId = req.params.classId;
    const sectId = req.params.sectId;
    const newName = req.body.sName;
    const inst = req.body.instructor;
    Users.findOne({ email: inst }, (err, usr) => {
        Sections.update({ _id: sectId }, { $set: { name: newName, instructor: usr.name, instructId: usr._id }}, () => {
            res.redirect(`/class/${classId}/section`);
        })
    });
});

// List all students in a section
app.get('/class/:classId/section/:id/student', (req, res) => {
    const sectionId = req.params.id;
    Sections.findOne({ _id: sectionId }, (err, sect) => {
        if(sect) {
            Students.find({sections: {$elemMatch: {$eq: sectionId}}}).collation({locale: "en", strength: 2}).sort({lastname: 1, firstname: 1}).exec(function (err, kids) {
                res.render('students', { classId: req.params.classId, currentSection: sect, students: kids, errors });
                errors = [];
            });
        }
    });
});

// Add student to a section
app.post('/class/:classId/section/:sectionId/student/create', (req, res) => {
    const sectId = req.params.sectionId;
    const cId = req.params.classId;
    const fName = req.body.firstname;
    const lName = req.body.lastname;
    const id = req.body.studentid;
    const email = req.body.studentemail;
    Students.findOne({ studentid: id }, (err1, stu) => {
        if(stu) {
            if(stu.sections.indexOf(sectId) != -1){
                errors.push('Student already exists.');
                res.redirect(`/class/${cId}/section/${sectId}/student`);
            }
            else{
                stu.sections.push(sectId);
                Students.update({studentid: id}, {$set: {sections: stu.sections}}, ()=>{
                    res.redirect(`/class/${cId}/section/${sectId}/student`);
                });
            }
        } else if(fName.length == 0 || lName.length == 0 || email.length == 0) {
            errors.push('Please fill out all fields.');
            res.redirect(`/class/${cId}/section/${sectId}/student`);
        } else if (fName.length > 50 || lName.length > 50 || email.length > 50) {
            errors.push('Input length must be between 1-50 characters.');
            res.redirect(`/class/${cId}/section/${sectId}/student`);
        } else {
            const newStudent = new Students({
                studentid: id,
                firstname: fName,
                lastname: lName,
                email: email,
            });
            newStudent.sections.push(sectId);
            newStudent.save();
            console.log(`Saved ${newStudent}!`);
            res.redirect(`/class/${cId}/section/${sectId}/student`);
        }
    });
});

// Edit a student's data
app.get('/class/:classId/section/:sectionId/student/:studentId/edit', (req, res) => {
    const id = req.params.studentId;
    Students.findOne({ studentid: id }, (err, stu) => {
        res.render('editing', { student: stu, classID: req.params.classId, sectionID: req.params.sectionId });
    });
});

// Update edits
app.post('/class/:classId/section/:sectionId/student/:studentId/edit', (req, res) => {
    const fName = req.body.firstname;
    const lName = req.body.lastname;
    const id = req.body.studentid;
    const email = req.body.studentemail;

    Students.update({ studentid: req.params.studentId }, { $set: { firstname: fName, lastname: lName, studentid: id, email: email }}, () => {
        res.redirect(`/class/${req.params.classId}/section/${req.params.sectionId}/student`);
    });
});

// Delete a student from a section
app.post('/class/:classId/section/:sectionId/student/:studentId/delete', (req, res) => {
    const sectId = req.params.sectionId;
    const cId = req.params.classId;
    const studentId = req.params.studentId;
    Students.findOne({ studentid: studentId }, (err1, student) => {
        var i = student.sections.indexOf(sectId);
        if(i > -1){
            student.sections.splice(i, 1);
        }
        if(student.sections.length === 0){
            Students.remove({studentid: studentId}, () => {
                res.redirect(`/class/${cId}/section/${sectId}/student`);
            });
        }
        else{
            Students.update({studentid: studentId}, {$set: {sections: student.sections}}, () => {
                res.redirect(`/class/${cId}/section/${sectId}/student`);
            });
        }
    });
});

var fieldData = [""];

// Load all rubrics in a class
app.get('/class/:classId/section/:sectId/rubric', (req, res) => {
    const assignmentDate = req.query.date;
    const assignmentTitle = req.query.title;
    const sectId = req.params.sectId;
    const classId = req.params.classId;
    Classes.findOne({ _id: classId }, (err, resultClass) => {
        Sections.findOne({ _id: sectId }, (err, resultSection) => {
            Rubrics.find({sectionId: {$elemMatch: {$eq: sectId}}, isMaster: true}, (err1, rubrics) => {
                res.render('rubric', {errors, resultClass, resultSection, rubrics, date: assignmentDate, title: assignmentTitle, data: fieldData});
                errors = [];
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
        newRubric.sectionId.push(sectId);
        for(var i = 0; i < fieldData.length; i++){
            newRubric.fields.push({title: fieldNames[i], pointsPossible: fieldValues[i], description: fieldDescriptions[i]});
        }
        newRubric.save(() => {
            console.log(`Saved ${newRubric}`);
            fieldData = [""];
            res.redirect(`/class/${classId}/section/${sectId}/rubric`);
        });
    } else {
        fieldData = [];
        for(var i = 0; i < fieldNames.length; i++){
            fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
        }
        res.redirect("/class/"+classId+"/section/"+sectId+"/rubric?date="+date+"&title="+title);
    }
});

//delete rubric from list
app.post('/class/:classId/section/:sectId/rubric/:rubricId/delete', (req, res) => {
    Rubrics.remove({_id:req.params.rubricId}, function(err){
        if(err){
            console.log("Uh oh error deleting rubric");
        }
        res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric');
    });
    
});

//add a field to rubric
app.post('/class/:classId/section/:sectId/rubric/addField', (req, res)=>{
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    fieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
    }
    fieldData.push("");
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric?date='+date+'&title='+title);
});

//remove last field from rubric
app.post('/class/:classId/section/:sectId/rubric/removeField', (req, res)=>{
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    fieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
    }
    if(fieldData.length > 1){
        fieldData.pop();
    }
    else{
        errors.push("Cannot remove last remaining field");
    }
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric?date='+date+'&title='+title);
});

//view rubrics and students
app.get('/class/:classId/section/:sectId/rubric/:rubricId/fillOut', (req, res) => {
    var CID = req.params.classId;
    var SID = req.params.sectId;
    var RID = req.params.rubricId;
    Rubrics.findOne({_id: RID}, (err, rubric) => {
        Students.find({sections: {$elemMatch: {$eq: SID}}}).collation({locale: "en", strength: 2}).sort({lastname: 1, firstname: 1}).exec(function (err, students) {
            res.render('fillOut', {rubric, students, classId: CID, sectionId: SID, rubricId: RID});
        });
    });
});

//fill out rubric for specific student
app.get('/class/:classId/section/:sectId/rubric/:rubricId/fillOut/:studentId', (req, res) => {
    var CID = req.params.classId;
    var SID = req.params.sectId;
    var RID = req.params.rubricId;
    var stud = req.params.studentId;
    Rubrics.findOne({_id: RID}, (err, rubric) => {
        Students.find({sections: {$elemMatch: {$eq: SID}}}).collation({locale: "en", strength: 2}).sort({lastname: 1, firstname: 1}).exec(function (err, students) {
            Students.findOne({_id: stud}, (err, student) => {
                Rubrics.findOne({studentId: stud, masterId: RID}, (err, studentRubric) => {
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
    for(var i = 0; i < points.length; i++){
        if(points[i] === ""){
            points[i] = 0;
        }
    }
    Rubrics.findOne({studentId: studId, masterId: RID}, (err, studentRubric) => {
        if(studentRubric){
            for(var i = 0; i < studentRubric.fields.length; i++){
                studentRubric.fields[i].pointsEarned = points[i];
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
                for(var i = 0; i < rubric.fields.length; i++){
                    newRubric.fields.push({title: rubric.fields[i].title,
                        pointsPossible: rubric.fields[i].pointsPossible,
                        pointsEarned: points[i],
                        description: rubric.fields[i].description,
                    });
                }
                newRubric.save(() => {
                    console.log(`Saved ${newRubric}`);
                    res.redirect(`/class/${CID}/section/${SID}/rubric/${RID}/fillOut`);
                });
            });
        }
    })
});

// Display list of students with their scores
app.get('/class/:classId/section/:sectId/rubric/:rubricId/viewScores', (req, res) => {
    Rubrics.findOne({ _id: req.params.rubricId }, (err, r) => {
        Students.find({ sections: req.params.sectId }, (err1, students) => {
            students.sort(function(a, b) {
                if(a.lastname < b.lastname) {
                    return -1;
                } else if(a.lastname > b.lastname) {
                    return 1;
                } else {
                    return 0;
                }
            });
            Rubrics.find({ assignmentTitle: r.assignmentTitle, isMaster: false }, (err2, rubrics) => {
                let joinStudentsRubrics = []; //student, totalScore, scores for each field, comments
                let sketchyFieldsPlaceholder = [];
                for(var i = 0; i < students.length; i++) {
                    for(var j = 0; j < rubrics.length; j++) {
                        if(students[i].studentid === rubrics[j].studentId) {
                            let pointsPossible = 0;
                            let pointsEarnedTotal = 0;
                            let fieldScores = [];
                            sketchyFieldsPlaceholder = [];
                            for(var k = 0; k < rubrics[j].fields.length; k++) {
                                sketchyFieldsPlaceholder.push({name: rubrics[j].fields[k].title});
                                let tmpTotal = rubrics[j].fields[k].pointsPossible;
                                let tmpEarned = rubrics[j].fields[k].pointsEarned;
                                pointsPossible += tmpTotal;
                                pointsEarnedTotal += tmpEarned;
                                fieldScores.push({tmpEarned: tmpEarned, tmpTotal: tmpTotal});
                            }
                            joinStudentsRubrics.push({stu: students[i], 
                                                    pointsEarnedTotal: pointsEarnedTotal, 
                                                    pointsPossible: pointsPossible, 
                                                    fieldScores: fieldScores, 
                                                    comments: rubrics[j].comments});
                            break;
                        }
                    }
                }
                res.render('grades', { sketchyFieldsPlaceholder, joinStudentsRubrics });
            });
        });
    });
});

// Edit rubric
app.get('/class/:classId/section/:sectId/rubric/:rubricId/edit', (req, res) => {
    const id = req.params.rubricId;
    Rubrics.findOne({ _id: id }, (err, rubric) => {
        res.render('editing', { rubric, classID: req.params.classId, sectionID: req.params.sectId });
    });
});

// Update edits
app.post('/class/:classId/section/:sectId/rubric/:rubricId/edit', (req, res) => {
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldName;
    const fieldDescs = req.body.fieldDesc;
    const fieldPts = req.body.fieldPts;

    Rubrics.findOne({ _id: req.params.rubricId }, (err, rubric) => {
        for(var i = 0; i < fieldNames.length; i++) {
            if(fieldNames[i]) {
                rubric.fields[i].title = fieldNames[i];
            }
            if(fieldDescs[i]) {
                rubric.fields[i].description = fieldDescs[i];
            }
            if(fieldPts[i]) {
                rubric.fields[i].pointsPossible = fieldPts[i];
            }
        }
        Rubrics.update({ _id: req.params.rubricId }, { $set: { assignmentDate: date, assignmentTitle: title, fields: rubric.fields }}, () => {
            res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric`);
        });
    });
});

// Start the server
const port = process.env.PORT || 3500;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
