const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 50,
};

const StudentSchema = new Schema({
    studentid: stringField,
    firstname: stringField,
    lastname: stringField,
    email: {
        type: String,
        minlength: 1,
        maxlength: 50,
        lowercase: true,
    },
});

const SectionSchema = new Schema({
    instructor: stringField, //id of teacher
    name: stringField,
    students: [StudentSchema], //array of students
    classId: String, //id of parent class
});

const sections = mongoose.model('Sections', SectionSchema);
const students = mongoose.model('Students', StudentSchema);
module.exports = {
    Sections: sections,
    Students: students,
};