const classModels = require('../models/classes.js');
const userModels = require('../models/users.js');
const Classes = classModels.Classes;
const Users = userModels.Users;

async function create(req, res){
    await classModels.createClass(req, res, Classes, Users);
    res.redirect('/');
}

async function edit(req, res){
    const c = await classModels.editClass(req, res, Classes);
    res.render('editing', { class: c });
}

async function updateEdits(req, res){
    await classModels.updateEdits(req, res, Classes);
    res.redirect('/');
}

async function deleteClass(req, res){
    await classModels.deleteClass(req, res, Classes);
    res.redirect('/');
}

async function loadAll(req, res){
    var errors = req.app.get('errors');
    var classes = await classModels.loadAll(req, res, Users, Classes);

    res.render('index', { classes, errors });
    req.app.set('errors', []);
}

module.exports = {
    create,
    edit,
    updateEdits,
    deleteClass,
    loadAll,
};