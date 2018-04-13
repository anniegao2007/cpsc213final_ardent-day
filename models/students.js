const mongoose = require('mongoose');

const Schema = mongoose.Schema;

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
    sections: [String],
    classes: [String],
});

module.exports = mongoose.model('Students', StudentSchema);