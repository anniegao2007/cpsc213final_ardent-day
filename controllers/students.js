const Classes = require('../models/classes.js');
const Sections = require('../models/sections.js');
const Users = require('../models/users.js');
const Students = require('../models/students.js');

async function loadAll(req, res){
    const sectionId = req.params.id;
    var errors = req.app.get('errors');
    Sections.findOne({ _id: sectionId }, (err, sect) => {
        if(sect) {
            Students.find({sections: {$elemMatch: {$eq: sectionId}}}).collation({locale: "en", strength: 2}).sort({lastname: 1, firstname: 1}).exec(function (err, kids) {
                res.render('students', { classId: req.params.classId, currentSection: sect, students: kids, errors });
                req.app.set('errors', []);
            });
        }
    });
}

async function createStudent(req, res){
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
}

async function editStudent(req, res){
    const id = req.params.studentId;
    Students.findOne({ studentid: id }, (err, stu) => {
        res.render('editing', { student: stu, classID: req.params.classId, sectionID: req.params.sectionId });
    });
}

async function updateEdits(req, res){
    const fName = req.body.firstname;
    const lName = req.body.lastname;
    const id = req.body.studentid;
    const email = req.body.studentemail;

    Students.update({ studentid: req.params.studentId }, { $set: { firstname: fName, lastname: lName, studentid: id, email: email }}, () => {
        res.redirect(`/class/${req.params.classId}/section/${req.params.sectionId}/student`);
    });
}

async function deleteStudent(req, res){
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
}

module.exports = {
    loadAll,
    createStudent,
    editStudent,
    updateEdits,
    deleteStudent,
};