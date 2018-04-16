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
});

const RubricSchema = new Schema({
    isMaster: Boolean,
    classId: String,
    sectionId: [String],
    studentId: String,
    assignmentDate: Date,
    assignmentTitle: stringField,
    fields: [Field],
    comments: String,
});

module.exports = mongoose.model('Rubrics', RubricSchema);