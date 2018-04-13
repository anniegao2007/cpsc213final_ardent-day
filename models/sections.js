const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 50,
};


const SectionSchema = new Schema({
    instructor: stringField, //id of teacher
    name: stringField,
    classId: String, //id of parent class
});

module.exports = mongoose.model('Sections', SectionSchema);