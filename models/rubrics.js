const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const stringField = {
    type: String,
    minlength: 1,
    maxlength: 100,
};
var Field = new Schema({
    title: String,
    description: String,
    pointsEarned: Number,
    pointsPossible: Number,
    criteria: [[String, Number]],
});

const RubricSchema = new Schema({
    isMaster: Boolean,
    masterId: String, //the _id of the rubric that is the master
    classId: String, //the _id of the class this rubric is for
    sectionId: [String], //array of section _id's that this rubric is in
    studentId: String, //this is the student's _id, a hash
    assignmentDate: Date,
    assignmentTitle: stringField,
    fields: [Field],
    comments: String,
    finalScore: Number,
    totalPts: Number,
});

module.exports = mongoose.model('Rubrics', RubricSchema);