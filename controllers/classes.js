const Classes = require('../models/classes.js');
const Users = require('../models/users.js');

async function create(req, res){
    const className = req.body.className;
    let instructors = req.body.instructors.trim().split(',');
    const regex = /.+@.+\..+/;

    var errors = req.app.get('errors');

    for(var i = 0; i < instructors.length; i++){
        if(instructors[i] === ""){
            instructors.splice(i, 1);
        }
    }

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
        if (errors.length === 0) {
            Users.findOne({ _id: req.session.userId }, (err, user) => {
                instructors.push(user.email);
                const newClass = new Classes({
                    instructors: instructors,
                    name: className,
                    // sectionIds: [],
                });
                console.log(newClass.instructors);
                newClass.save(() => {
                    console.log(`Saved ${newClass}`);
                    res.redirect('/');
                });
            });
        } else {
            res.redirect('/');
        }
    });
}

async function edit(req, res){
    const classId = req.params.id;
    Classes.findOne({ _id: classId }, (err, c) => {
        res.render('editing', { class: c });
    });
}

async function updateEdits(req, res){
    const newName = req.body.classname;
    const instructors = req.body.instructors.trim().split(',');
    Classes.update({ _id: req.params.id }, { $set: { name: newName, instructors }}, () => {
        res.redirect('/');
    });
}

async function deleteClass(req, res){
    const cId = req.params.id;
    Classes.findOne({ _id: cId }, (err, c) => {
        if(c.instructors.length > 1) {
            let instIndex = c.instructors.indexOf(cId);
            c.instructors.splice(instIndex, 1);
            Classes.update({ _id: cId }, { $set: { instructors: c.instructors }}, () => {
                res.redirect('/');
            });
        } else {
            Classes.remove({ _id: req.params.id }, () => {
                res.redirect('/');
            })
        }
    });
}

async function loadAll(req, res){
    var errors = req.app.get('errors');
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
    req.app.set('errors', errors);
}

module.exports = {
    create,
    edit,
    updateEdits,
    deleteClass,
    loadAll,
};