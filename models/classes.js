const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 50,
};

const ClassSchema = new Schema({
    instructors: [String],
    name: stringField,
    // sectionIds: [Number],
    //consider where to put rubrics, sections 
});

async function loadAll(req, res, Users, Classes){
    return new Promise((resolve, reject) => {
        if (req.session.userId) {
            Users.findOne({ _id: req.session.userId }, (err, user) => {
                Classes.find({ instructors: user.email }, (err1, classes) => {
                    resolve(classes);
                });
            });
        } else {
            resolve([]);
        }
    });
}
async function deleteClass(req, res, Classes){
    return new Promise((resolve, reject) => {
        const cId = req.params.id;
        Classes.findOne({ _id: cId }, (err, c) => {
            if(c.instructors.length > 1) {
                let instIndex = c.instructors.indexOf(cId);
                c.instructors.splice(instIndex, 1);
                Classes.update({ _id: cId }, { $set: { instructors: c.instructors }}, () => {
                    resolve();
                });
            } else {
                Classes.remove({ _id: req.params.id }, () => {
                    resolve();
                })
            }
        });
    });
}

async function updateEdits(req, res, Classes){
    return new Promise((resolve, reject) => {
        const newName = req.body.classname;
        const instructors = req.body.instructors.trim().split(',');
        Classes.update({ _id: req.params.id }, { $set: { name: newName, instructors }}, () => {
            resolve();
        });
    });
}

async function editClass(req, res, Classes){
    return new Promise((resolve, reject) => {
        const classId = req.params.id;
        Classes.findOne({ _id: classId }, (err, c) => {
            resolve(c);
        });
    })
}

async function createClass(req, res, Classes, Users){
    return new Promise((resolve, reject) => {
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
                        resolve();
                    });
                });
            } else {
                resolve();
            }
        });
    });
}

module.exports = { 
    Classes: mongoose.model('Classes', ClassSchema),
    loadAll,
    deleteClass,
    updateEdits,
    editClass,
    createClass,
}