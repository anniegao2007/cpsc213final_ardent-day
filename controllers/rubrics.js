const classModels = require('../models/classes.js');
const sectionModels = require('../models/sections.js');
const userModels = require('../models/users.js');
const studentModels = require('../models/students.js');
const rubricModels = require('../models/rubrics.js');

const Classes = classModels.Classes;
const Sections = sectionModels.Sections;
const Users = userModels.Users;
const Students = studentModels.Students;
const Rubrics = rubricModels.Rubrics;

async function loadAll(req, res){
    const result = await rubricModels.loadAll(req, res, Classes, Sections, Rubrics);
    res.render('rubric', result);
    req.app.set('errors', []);
    req.app.set('fieldData', [""]);
}

async function createRubric(req, res){
    const result = await rubricModels.createRubric(req, res, Sections, Rubrics);
    if(result){
        req.app.set('fieldData', [""]);
        res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric`);
    }
    else{
        res.redirect("/class/"+req.params.classId+"/section/"+req.params.sectId+"/rubric?date="+req.body.date+"&title="+req.body.title);
    }
}

async function deleteRubric(req, res){
    await rubricModels.deleteRubric(req, res, Rubrics);
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric');
}

async function cloneRubric(req, res){
    await rubricModels.cloneRubric(req, res, Rubrics);
    res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric`);
}

async function addField(req, res){
    const result = await rubricModels.addField(req, res);
    req.app.set('fieldData', result);
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric?date='+req.body.date+'&title='+req.body.title);

}

async function removeField(req, res){
    const result = await rubricModels.removeField(req, res);
    req.app.set('fieldData', result);
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric?date='+req.body.date+'&title='+req.body.title);

}

async function editRubric(req, res){
    const result = await rubricModels.editRubric(req, res, Rubrics);
    res.render('editing', result);
    req.app.set('editFieldData', []);
    req.app.set('errors', []);

}

async function editAddField(req, res){
    const result = await rubricModels.editAddField(req, res);
    req.app.set('fieldChanged', 1);
    req.app.set('editFieldData', result);
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric/'+req.params.rubricId+'/edit?date='+req.body.date);
}

async function editRemoveField(req, res){
    const result = await rubricModels.editRemoveField(req, res);
    req.app.set('editFieldData', result.editFieldData);
    req.app.set('fieldChanged', result.fieldChanged);
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric/'+req.params.rubricId+'/edit?date='+req.body.date);

}

async function updateEdits(req, res){
    const result = await rubricModels.updateEdits(req, res, Rubrics);
    if(result === 1){
        req.app.set('editFieldData', []);
        res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric`);
    }
    else{
        req.app.set('editFieldData', result);
        req.app.set('fieldChanged', 1);
        res.redirect("/class/"+req.params.classId+"/section/"+req.params.sectId+"/rubric/"+req.params.rubricId+"/edit?date="+req.body.date);
    }
}

async function fillOut(req, res){
    const result = await rubricModels.fillOut(req, res, Rubrics, Students);
    res.render('fillOut', result);
}

async function fillOutStudent(req, res){
    const result = await rubricModels.fillOutStudent(req, res, Rubrics, Students);
    res.render('fillOut', result);
}

async function submitRubric(req, res){
    await rubricModels.submitRubric(req, res, Rubrics);
    res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric/${req.params.rubricId}/fillOut`);
}

async function displayScores(req, res){
    const result = await rubricModels.displayScores(req, res, Rubrics, Students);
    console.log(result);
    res.render('grades', result);
}

module.exports = {
    loadAll,
    createRubric,
    editRubric,
    updateEdits,
    deleteRubric,
    cloneRubric,
    addField,
    removeField,
    editAddField,
    editRemoveField,
    fillOut,
    fillOutStudent,
    submitRubric,
    displayScores,
};