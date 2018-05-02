const classModels = require('../models/classes.js');
const sectionModels = require('../models/sections.js');
const userModels = require('../models/users.js');
const studentModels = require('../models/students.js');

const Classes = classModels.Classes;
const Sections = sectionModels.Sections;
const Users = userModels.Users;
const Students = studentModels.Students;

async function loadAll(req, res){
    const result = await studentModels.loadAll(req, res, Sections, Students);
    res.render('students', result);
    req.app.set('errors', []);
}

async function createStudent(req, res){
    await studentModels.createStudent(req, res, Students);
    res.redirect(`/class/${req.params.classId}/section/${req.params.sectionId}/student`);
}

async function editStudent(req, res){
    const result = await studentModels.editStudent(req, res, Students);
    res.render('editing', result);
}

async function updateEdits(req, res){
    await studentModels.updateEdits(req, res, Students);
    res.redirect(`/class/${req.params.classId}/section/${req.params.sectionId}/student`);
}

async function deleteStudent(req, res){
    await studentModels.deleteStudent(req, res, Students);
    console.log("resolved");
    res.redirect(`/class/${req.params.classId}/section/${req.params.sectionId}/student`);
}

module.exports = {
    loadAll,
    createStudent,
    editStudent,
    updateEdits,
    deleteStudent,
};