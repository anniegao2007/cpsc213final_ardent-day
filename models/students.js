const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StudentSchema = new Schema({
    studentid: String,
    firstname: String,
    lastname: String,
    email: {
        type: String,
        minlength: 1,
        maxlength: 50,
        lowercase: true,
    },
    sections: [String], //sectionids
    classes: [String],
});

async function loadAll(req, res, Sections, Students){
    return new Promise((resolve, reject) => {
        const sectionId = req.params.id;
        var errors = req.app.get('errors');
        Sections.findOne({ _id: sectionId }, (err, sect) => {
            if(sect) {
                Students.find({sections: {$elemMatch: {$eq: sectionId}}}).collation({locale: "en", strength: 2}).sort({lastname: 1, firstname: 1}).exec(function (err, kids) {
                    resolve({ classId: req.params.classId, currentSection: sect, students: kids, errors });
                    
                });
            }
        });
    });
}

async function createStudent(req, res, Students){
    return new Promise((resolve, reject) => {
        const sectId = req.params.sectionId;
        const cId = req.params.classId;
        const fName = req.body.firstname;
        const lName = req.body.lastname;
        const id = req.body.studentid;
        const email = req.body.studentemail;

        var errors = req.app.get('errors');

        Students.findOne({ studentid: id }, (err1, stu) => {
            if(stu) {
                if(stu.sections.indexOf(sectId) != -1){
                    errors.push('Student already exists.');
                    resolve();
                }
                else{
                    stu.sections.push(sectId);
                    Students.update({studentid: id}, {$set: {sections: stu.sections}}, ()=>{
                        resolve();
                    });
                }
            } else if(fName.length == 0 || lName.length == 0 || email.length == 0) {
                errors.push('Please fill out all fields.');
                resolve();
            } else if (fName.length > 50 || lName.length > 50 || email.length > 50) {
                errors.push('Input length must be between 1-50 characters.');
                resolve();
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
                resolve();
            }
        });
    });
}

async function editStudent(req, res, Students){
    return new Promise((resolve, reject) => {
        const id = req.params.studentId;
        Students.findOne({ studentid: id }, (err, stu) => {
            resolve({ student: stu, classID: req.params.classId, sectionID: req.params.sectionId });
        });
    });
}

async function updateEdits(req, res, Students){
    return new Promise((resolve, reject) => {
        const fName = req.body.firstname;
        const lName = req.body.lastname;
        const id = req.body.studentid;
        const email = req.body.studentemail;

        Students.update({ studentid: req.params.studentId }, { $set: { firstname: fName, lastname: lName, studentid: id, email: email }}, () => {
            resolve();
        });
    });
}

async function deleteStudent(req, res, Students){
    return new Promise((resolve, reject) => {
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
                    resolve();
                });
            }
            else{
                Students.update({studentid: studentId}, {$set: {sections: student.sections}}, () => {
                    resolve();
                });
            }
        });
    });
}

module.exports = {
    Students: mongoose.model('Students', StudentSchema),
    loadAll,
    createStudent,
    editStudent,
    updateEdits,
    deleteStudent,
}