const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 50,
};


const SectionSchema = new Schema({
    instructor: stringField, //name of teacher
    instructorId: String, //_id of instructor
    name: stringField,
    classId: String, //id of parent class
});

async function loadAll(req, res, Classes, Sections){
    return new Promise((resolve, reject) => {
        var errors = req.app.get('errors');
        const id = req.params.id;
        Classes.findOne({ _id: id }, (err, resultClass) => {
            Sections.find({ classId: id }, (err1, sections) => {
                resolve({resultClass, sections, errors});
            });
        });
    });
}

async function createSection(req, res, Users, Sections){
    return new Promise((resolve, reject) => {
        const classId = req.params.id;
        const sectionName = req.body.name;
        const instructorEmail = req.body.instructor;
    
        var errors = req.app.get('errors');
    
        Users.findOne({ email: instructorEmail }, (err, user) => {
            if(user) {
                const newSection = new Sections({
                    instructor: user.name,
                    instructorId: user._id,
                    name: sectionName,
                    classId: classId,
                });
                newSection.save(() => {
                    resolve();
                });
            } else {
                errors.push("Instructor not registered in database.");
                resolve();
            }
        });
    });
}

async function deleteSection(req, res, Sections){
    return new Promise((resolve, reject) => {
        const sectionID = req.params.id;
        const classId = req.params.classId;
        Sections.findOne({ _id: sectionID }, (err, resultClass) => {
            // delete all rubrics and remove sectionid from each student
            Sections.remove(resultClass, () => {
                /* Students.find({ section: sectionID }, (err1, students) => {
                    for(var i = 0; i < students.length; i++) {
                        let sectIndex = students[i].sections.indexOf(sectionID);
                        students[i].sections.splice(sectIndex, 1);
                        Students.update({ _id: students[i]._id }, { $set: { sections: students[i].sections }}, (err2) => {
                            if(err2) {
                                console.log(err2);
                            }
                        });
                    }
                    Rubrics.find({ sectionId: sectionID }, (err1, rubs) => {
                        for(var i = 0; i < rubs.length; i++) {
                            let sectIndex = rubs[i].sectionId.indexOf(sectionID);
                            rubs[i].sectionId.splice(sectIndex, 1);
                            Rubrics.update({ _id: rubs[i]._id }, { $set: { sectionId: rubs[i].sectionId }}, (err2) => {
                                if(err2) {
                                    console.log(err2);
                                }
                            });
                        }
                    });
                }); */
                resolve();
            });
        });
    });
}

async function editSection(req, res, Sections, Users){
    return new Promise((resolve, reject) => {
        const classId = req.params.classId;
        const sectId = req.params.sectId;
        Sections.findOne({ _id: sectId }, (err, sect) => {
            Users.findOne({ _id: sect.instructorId }, (err, user) => {
                resolve({section: sect, classID: classId, instructorEmail: user.email});
            });
        });
    });
}

async function updateEdits(req, res, Users, Sections){
    return new Promise((resolve, reject) => {
        const classId = req.params.classId;
        const sectId = req.params.sectId;
        const newName = req.body.sName;
        const inst = req.body.instructor;
        Users.findOne({ email: inst }, (err, usr) => {
            Sections.update({ _id: sectId }, { $set: { name: newName, instructor: usr.name, instructId: usr._id }}, () => {
                resolve();
            })
        });
    });
}

module.exports = {
    Sections: mongoose.model('Sections', SectionSchema),
    loadAll,
    createSection,
    deleteSection,
    editSection,
    updateEdits,
}