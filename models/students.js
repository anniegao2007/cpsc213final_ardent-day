const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 500.
};

const StudentSchema = new Schema({
    firstname: stringField,
    lastname: stringField,
    studentid: stringField,
    email: {
        type: String,
        minlength: 1,
        maxlength: 50,
        lowercase: true,
        unique: true,
    },
});

module.exports = mongoose.model('Student', StudentSchema);