const classModels = require('../models/classes.js');
const sectionModels = require('../models/sections.js');
const userModels = require('../models/users.js');

const Classes = classModels.Classes;
const Sections = sectionModels.Sections;
const Users = userModels.Users;

async function loadAll(req, res){
    var result = await sectionModels.loadAll(req, res, Classes, Sections);
    res.render('sections', result);
    req.app.set('errors', []);
}

async function createSection(req, res){
    await sectionModels.createSection(req, res, Users, Sections);
    res.redirect(`/class/${req.params.id}/section`);
}

async function deleteSection(req, res){
    await sectionModels.deleteSection(req, res, Sections);
    res.redirect(`/class/${req.params.classId}/section`);
}

async function editSection(req, res){
    const result = await sectionModels.editSection(req, res, Sections, Users);
    res.render('editing', result);
}

async function updateEdits(req, res){
    await sectionModels.updateEdits(req, res, Users, Sections);
    res.redirect(`/class/${req.params.classId}/section`);
}

module.exports = {
    loadAll,
    createSection,
    deleteSection,
    editSection,
    updateEdits,
};