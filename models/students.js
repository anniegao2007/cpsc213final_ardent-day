const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 500.
};

const StudentSchema = new Schema({
    studentid: String,
    firstname: String,
    lastname: String,
    email: {
        type: String,
        minlength: 1,
        maxlength: 50,
        lowercase: true,
    },
});

module.exports = mongoose.model('Student', StudentSchema);