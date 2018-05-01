const classModels = require('../models/classes.js');
const sectionModels = require('../models/sections.js');
const userModels = require('../models/users.js');
const studentModels = require('../models/students.js');
const rubricModels = require('../models/rubrics.js');

const ss = require('simple-statistics');
const plotly = require('plotly')("ardent-day", "mpWDqBKdKQDkPalrCoeN");

const Classes = classModels.Classes;
const Sections = sectionModels.Sections;
const Users = userModels.Users;
const Students = studentModels.Students;
const Rubrics = rubricModels.Rubrics;

async function loadAll(req, res){
    const assignmentDate = req.query.date;
    const assignmentTitle = req.query.title;
    const sectId = req.params.sectId;
    const classId = req.params.classId;
    var errors = req.app.get('errors');
    var fieldData = req.app.get('fieldData');
    Classes.findOne({ _id: classId }, (err, resultClass) => {
        Sections.findOne({ _id: sectId }, (err, resultSection) => {
            Rubrics.find({sectionId: {$elemMatch: {$eq: sectId}}, isMaster: true}, (err1, rubrics) => {
                res.render('rubric', {errors, resultClass, resultSection, rubrics, date: assignmentDate, title: assignmentTitle, data: fieldData});
                req.app.set('errors', []);
                req.app.set('fieldData', [""]);
            });
        });
    });
}

async function createRubric(req, res){
    const date = req.body.date;
    const title = req.body.title;
    const classId = req.params.classId;
    const sectId = req.params.sectId;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    const radio = req.body.scope;
    var errors = req.app.get('errors');
    var fieldData = req.app.get('fieldData');
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
        if(radio === "thisSection") {
            newRubric.sectionId.push(sectId);
            for(var i = 0; i < fieldNames.length; i++){
                newRubric.fields.push({title: fieldNames[i], pointsPossible: fieldValues[i], description: fieldDescriptions[i]});
            }
            newRubric.save(() => {
                console.log(`Saved ${newRubric}`);
                req.app.set('fieldData', [""]);
                res.redirect(`/class/${classId}/section/${sectId}/rubric`);
            });
        } else {
            Sections.find({ classId: classId }, (err, sects) => {
                for(var i = 0; i < sects.length; i++) {
                    newRubric.sectionId.push(sects[i]._id);
                }
                for(var i = 0; i < fieldNames.length; i++){
                    newRubric.fields.push({title: fieldNames[i], pointsPossible: fieldValues[i], description: fieldDescriptions[i]});
                }
                newRubric.save(() => {
                    console.log(`Saved ${newRubric}`);
                    req.app.set('fieldData', [""]);
                    res.redirect(`/class/${classId}/section/${sectId}/rubric`);
                });
            });
        }
    } else {
        fieldData = [];
        for(var i = 0; i < fieldNames.length; i++){
            fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
        }
        res.redirect("/class/"+classId+"/section/"+sectId+"/rubric?date="+date+"&title="+title);
    }
}

async function deleteRubric(req, res){
    Rubrics.remove({_id:req.params.rubricId}, function(err){
        if(err){
            console.log("Uh oh error deleting rubric");
        }
        res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric');
    });
}

async function cloneRubric(req, res){
    Rubrics.findOne({ _id: req.params.rubricId }, (err, r) => {
        const newRubric = new Rubrics ({
            isMaster: true,
            classId: req.params.classId,
            sectionId: r.sectionId,
            assignmentDate: r.assignmentDate,
            assignmentTitle: `${r.assignmentTitle} Clone`,
            fields: r.fields,
        });
        newRubric.save(() => {
            console.log(`Saved: ${newRubric}`);
            res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric`);
        });
    })
}

async function addField(req, res){
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    var fieldData = req.app.get('fieldData');
    fieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        fieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
    }
    fieldData.push("");
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric?date='+date+'&title='+title);
}

async function removeField(req, res){
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldNames;
    const fieldValues = req.body.fieldValues;
    const fieldDescriptions = req.body.fieldDescriptions;
    var fieldData = req.app.get('fieldData');
    var errors = req.app.get('errors');
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
}

async function editRubric(req, res){
    const id = req.params.rubricId;
    var assignmentDate = req.query.date;
    var editFieldData = req.app.get('editFieldData');
    var fieldChanged = req.app.get('fieldChanged');
    var errors = req.app.get('errors');
    Rubrics.findOne({ _id: id }, (err, rubric) => {
        if(!fieldChanged){
            editFieldData = [];
            for(var i = 0; i < rubric.fields.length; i++){
                editFieldData.push({title: rubric.fields[i].title, description: rubric.fields[i].description, pointsPossible: rubric.fields[i].pointsPossible});
            }
        }
        else{
            fieldChanged = 0;
        }
        var d = new Date(rubric.assignmentDate),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = '' + d.getFullYear();

        if (month.length < 2){ month = '0' + month;}
        if (day.length < 2){ day = '0' + day;}
        if (year.length < 4){
            var zero = "";
            for(var i = 0; i < 4 - year.length; i++){
                zero += '0';
            }
            year = zero + year;
        }
        var stringDate = [year, month, day].join('-')
        console.log("date from rubric", stringDate);
        if(!assignmentDate){assignmentDate = stringDate;}
        
        res.render('editing', { rubric, classID: req.params.classId, date: assignmentDate, sectionID: req.params.sectId, data: editFieldData, errors });
        req.app.set('editFieldData', []);
        req.app.set('errors', []);
    });
}

async function editAddField(req, res){
    const date = req.body.date;
    const fieldNames = req.body.fieldName;
    const fieldValues = req.body.fieldPts;
    const fieldDescriptions = req.body.fieldDesc;
    var editFieldData = req.app.get('editFieldData');
    var fieldChanged = req.app.get('fieldChanged');
    editFieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
    }
    editFieldData.push("");
    fieldChanged = 1;
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric/'+req.params.rubricId+'/edit?date='+date);
}

async function editRemoveField(req, res){
    const date = req.body.date;
    const fieldNames = req.body.fieldName;
    const fieldValues = req.body.fieldPts;
    const fieldDescriptions = req.body.fieldDesc;
    var editFieldData = req.app.get('editFieldData');
    var fieldChanged = req.app.get('fieldChanged');
    var errors = req.app.get('errors');
    editFieldData = [];
    for(var i = 0; i < fieldNames.length; i++){
        editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
    }
    if(editFieldData.length > 1){
        editFieldData.pop();
        fieldChanged = 1;
    }
    else{
        errors.push("Cannot remove last remaining field");
    }
    res.redirect('/class/' + req.params.classId + '/section/' + req.params.sectId + '/rubric/'+req.params.rubricId+'/edit?date='+date);
}

async function updateEdits(req, res){
    const date = req.body.date;
    const title = req.body.title;
    const fieldNames = req.body.fieldName;
    const fieldDescriptions = req.body.fieldDesc;
    const fieldValues = req.body.fieldPts;
    var errors = req.app.get('errors');
    var editFieldData = req.app.get('editFieldData');
    var fieldChanged = req.app.get('fieldChanged');
    for(var i  = 0; i < fieldNames.length; i++){
        if(fieldNames[i] == "" || fieldValues[i] == ""){
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
    if(errors.length === 0){
        Rubrics.findOne({ _id: req.params.rubricId, isMaster: true }, (err, rubric) => {
            if((typeof fieldNames) === "object") {
                editFieldData = [];
                for(var i = 0; i < fieldNames.length; i++){
                    editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
                }
            } else if((typeof fieldNames) === "string") {
                rubric.fields[0].title = fieldNames;
                rubric.fields[0].description = fieldDescs;
                rubric.fields[0].pointsPossible = fieldPts;
            }
            Rubrics.update({ _id: req.params.rubricId }, { $set: { assignmentDate: date, assignmentTitle: title, fields: editFieldData }}, () => {
                Rubrics.remove({masterId: req.params.rubricId}, () =>{
                    editFieldData = [];
                    res.redirect(`/class/${req.params.classId}/section/${req.params.sectId}/rubric`);
                })
            });
        });
    }
    else{
        editFieldData = [];
        for(var i = 0; i < fieldNames.length; i++){
            editFieldData.push({title: fieldNames[i], description: fieldDescriptions[i], pointsPossible: fieldValues[i]});
        }
        fieldChanged = 1;
        res.redirect("/class/"+req.params.classId+"/section/"+req.params.sectId+"/rubric/"+req.params.rubricId+"/edit?date="+date);
    }
}

async function fillOut(req, res){
    var CID = req.params.classId;
    var SID = req.params.sectId;
    var RID = req.params.rubricId;
    Rubrics.findOne({_id: RID}, (err, rubric) => {
        Students.find({sections: {$elemMatch: {$eq: SID}}}).collation({locale: "en", strength: 2}).sort({lastname: 1, firstname: 1}).exec(function (err, students) {
            res.render('fillOut', {rubric, students, classId: CID, sectionId: SID, rubricId: RID});
        });
    });
}

async function fillOutStudent(req, res){
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
}

async function submitRubric(req, res){
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
}

async function displayScores(req, res){
    Rubrics.findOne({ _id: req.params.rubricId, isMaster: true }, (err, r) => {
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
            Rubrics.find({ masterId: r._id }, (err2, rubrics) => {
                let joinStudentsRubrics = []; //student, totalScore, scores for each field, comments
                let sketchyFieldsPlaceholder = [];
                let totalFieldPts = [];
                let pointsPossible = 0;
                for(var i = 0; i < students.length; i++) {
                    for(var j = 0; j < rubrics.length; j++) {
                        if(students[i]._id == rubrics[j].studentId) {
                            pointsPossible = 0;
                            let pointsEarnedTotal = 0;
                            let fieldScores = [];
                            //let totalFieldPts = [];
                            //let statistics = [];
                            sketchyFieldsPlaceholder = [];
                            // let individualFieldPts = [];
                            for(var k = 0; k < rubrics[j].fields.length; k++) {
                                sketchyFieldsPlaceholder.push({name: rubrics[j].fields[k].title});
                                let tmpTotal = rubrics[j].fields[k].pointsPossible;
                                let tmpEarned = rubrics[j].fields[k].pointsEarned;
                                // individualFieldPts.push({ pts: rubrics[j].fields[k].pointsEarned });
                                pointsPossible += tmpTotal;
                                pointsEarnedTotal += tmpEarned;
                                fieldScores.push({tmpEarned: tmpEarned, tmpTotal: tmpTotal});
                            }
                            totalFieldPts.push(pointsEarnedTotal);
                            joinStudentsRubrics.push({stu: students[i], 
                                                    pointsEarnedTotal: pointsEarnedTotal, 
                                                    pointsPossible: pointsPossible, 
                                                    fieldScores: fieldScores, 
                                                    comments: rubrics[j].comments});
                            break;
                        }
                    }
                }
                let statistics = [];
                if(totalFieldPts.length > 0) {
                    statistics = {
                        low: ss.min(totalFieldPts), 
                        high: ss.max(totalFieldPts),
                        mean: ss.mean(totalFieldPts).toFixed(3),
                        median: ss.median(totalFieldPts),
                        stddev: ss.standardDeviation(totalFieldPts).toFixed(3),
                     };
                     const histogramData = [{
                         x: totalFieldPts,
                         xbins: {
                            start: 0,
                            end: pointsPossible * (7/6.0),
                            size: pointsPossible / 7,
                         },
                         type: "histogram"
                     }];
                     const layout = {
                         xaxis: { 
                             range: [0, pointsPossible * (7/6.0) ],
                             title: "Overall Score", 
                         },
                         yaxis: { 
                             range: [0, students.length],
                             title: "Number of Students", 
                        },
                        bargap: 0.15,
                     };
                     let graphOptions = {layout: layout, filename: "basic-histogram", fileopt: "overwrite"};
                     plotly.plot(histogramData, graphOptions, function(err, msg) {
                        //console.log(msg);
                        res.render('grades', { classId: req.params.classId, sectId: req.params.sectId, sketchyFieldsPlaceholder, joinStudentsRubrics, statistics });
                     });
                } else {
                    res.render('grades', { classId: req.params.classId, sectId: req.params.sectId, sketchyFieldsPlaceholder, joinStudentsRubrics, statistics });
                }
            });
        });
    });
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